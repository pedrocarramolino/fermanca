import type { SupabaseClient } from "@supabase/supabase-js";
import {
  hasPracticedTime,
  type PublicSessionSummary,
  type Session,
  type SessionBlock,
  type SessionStatus,
} from "@/core/domain/session";
import type { CategoryId, SessionBlockId, SessionId, TemplateId, UserId } from "@/core/domain/ids";
import type {
  NewSessionBlock,
  SessionHistoryFilter,
  SessionRepository,
} from "@/core/domain/repositories/session-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import {
  PHASE_FIVE_MIN_ALERT_LEAD_SECONDS,
  scheduleSessionPhaseAlert,
  scheduleSessionPhaseFiveMinAlert,
  scheduleStreakAlert,
} from "@/core/infrastructure/qstash/client";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];
type SessionBlockRow = Database["public"]["Tables"]["session_blocks"]["Row"];
type SessionWithBlocksRow = SessionRow & { session_blocks: SessionBlockRow[] };

function blockToDomain(row: SessionBlockRow): SessionBlock {
  return {
    id: row.id as SessionBlockId,
    sessionId: row.session_id as SessionId,
    categoryId: row.category_id as SessionBlock["categoryId"],
    name: row.name,
    color: row.color,
    position: row.position,
    plannedDurationSeconds: row.planned_duration_seconds,
    actualDurationSeconds: row.actual_duration_seconds,
    status: row.status,
    startedAt: row.started_at ? new Date(row.started_at) : null,
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    note: row.note,
    pausedRemainingSeconds: row.paused_remaining_seconds,
  };
}

function toDomain(row: SessionWithBlocksRow): Session {
  return {
    id: row.id as SessionId,
    ownerId: row.owner_id as UserId,
    templateId: row.template_id as TemplateId | null,
    status: row.status,
    plannedDurationSeconds: row.planned_duration_seconds,
    actualDurationSeconds: row.actual_duration_seconds,
    startedAt: new Date(row.started_at),
    endedAt: row.ended_at ? new Date(row.ended_at) : null,
    finalNote: row.final_note,
    blocks: [...row.session_blocks].sort((a, b) => a.position - b.position).map(blockToDomain),
    linkedSessionId: row.linked_session_id as SessionId | null,
    linkedSessionPeerUsername: row.linked_session_peer_username,
  };
}

const SELECT_WITH_BLOCKS = "*, session_blocks(*)";

export class SupabaseSessionRepository implements SessionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async listByOwner(ownerId: UserId, filter?: SessionHistoryFilter): Promise<Session[]> {
    let query = this.client
      .from("sessions")
      .select(SELECT_WITH_BLOCKS)
      .eq("owner_id", ownerId)
      .order("started_at", { ascending: false });

    if (filter?.from) query = query.gte("started_at", filter.from.toISOString());
    if (filter?.to) query = query.lte("started_at", filter.to.toISOString());
    if (filter?.limit) query = query.limit(filter.limit);
    if (filter?.offset)
      query = query.range(filter.offset, filter.offset + (filter.limit ?? 20) - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data as SessionWithBlocksRow[]).map(toDomain);
  }

  async getById(id: SessionId, ownerId: UserId): Promise<Session | null> {
    const { data, error } = await this.client
      .from("sessions")
      .select(SELECT_WITH_BLOCKS)
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();

    if (error) throw error;
    return data ? toDomain(data as SessionWithBlocksRow) : null;
  }

  async remove(id: SessionId, ownerId: UserId): Promise<void> {
    const { error } = await this.client
      .from("sessions")
      .delete()
      .eq("id", id)
      .eq("owner_id", ownerId)
      .neq("status", "in_progress");
    if (error) throw error;
  }

  async start(input: {
    ownerId: UserId;
    templateId: TemplateId | null;
    plannedDurationSeconds: number;
    blocks: NewSessionBlock[];
  }): Promise<Session> {
    const { data: sessionRow, error: sessionError } = await this.client
      .from("sessions")
      .insert({
        owner_id: input.ownerId,
        template_id: input.templateId,
        planned_duration_seconds: input.plannedDurationSeconds,
      })
      .select("*")
      .single();
    if (sessionError) throw sessionError;

    // El primer bloque arranca solo, como siempre; los siguientes esperan
    // confirmación explícita del usuario (ver useSessionRuntime), así que
    // se quedan 'pending' sin started_at hasta que les toque. Todas las
    // filas llevan las mismas columnas explícitas — un insert masivo con
    // columnas distintas por fila confunde a PostgREST.
    const { data: blockRows, error: blocksError } = await this.client
      .from("session_blocks")
      .insert(
        input.blocks.map((block, index) => ({
          session_id: sessionRow.id,
          category_id: block.categoryId,
          name: block.name,
          color: block.color,
          position: block.position,
          planned_duration_seconds: block.plannedDurationSeconds,
          status: index === 0 ? ("active" as const) : ("pending" as const),
          started_at: index === 0 ? sessionRow.started_at : null,
        })),
      )
      .select("id, position, planned_duration_seconds");
    if (blocksError) throw blocksError;

    // Se programa después del insert (no antes) porque el id del bloque lo
    // genera la base de datos y hace falta para el cuerpo del mensaje.
    const firstBlock = blockRows.find((row) => row.position === 0);
    if (firstBlock) {
      const messageId = await scheduleSessionPhaseAlert(
        firstBlock.id,
        firstBlock.planned_duration_seconds,
      );
      // El de "quedan 5 minutos" solo tiene sentido si la fase dura más que
      // ese margen — una fase de 3 minutos no tiene un "quedan 5" que avisar.
      const fiveMinMessageId =
        firstBlock.planned_duration_seconds > PHASE_FIVE_MIN_ALERT_LEAD_SECONDS
          ? await scheduleSessionPhaseFiveMinAlert(
              firstBlock.id,
              firstBlock.planned_duration_seconds - PHASE_FIVE_MIN_ALERT_LEAD_SECONDS,
            )
          : null;
      const { error: messageIdError } = await this.client
        .from("session_blocks")
        .update({ qstash_message_id: messageId, qstash_five_min_message_id: fiveMinMessageId })
        .eq("id", firstBlock.id);
      if (messageIdError) throw messageIdError;
    }

    const created = await this.getById(sessionRow.id as SessionId, input.ownerId);
    if (!created) throw new Error("No se pudo crear la sesión.");
    return created;
  }

  async logManual(input: {
    ownerId: UserId;
    startedAt: Date;
    blocks: NewSessionBlock[];
  }): Promise<Session> {
    const plannedDurationSeconds = input.blocks.reduce(
      (total, block) => total + block.plannedDurationSeconds,
      0,
    );
    const endedAt = new Date(input.startedAt.getTime() + plannedDurationSeconds * 1000);

    const { data: sessionRow, error: sessionError } = await this.client
      .from("sessions")
      .insert({
        owner_id: input.ownerId,
        template_id: null,
        planned_duration_seconds: plannedDurationSeconds,
        actual_duration_seconds: plannedDurationSeconds,
        status: "completed",
        started_at: input.startedAt.toISOString(),
        ended_at: endedAt.toISOString(),
      })
      .select("*")
      .single();
    if (sessionError) throw sessionError;

    // Cada bloque encadena started_at/ended_at uno detrás de otro a partir
    // de startedAt, en el mismo orden en que llegan — una sesión registrada
    // a mano no tiene pausas entre fases que reconstruir.
    let cursorMs = input.startedAt.getTime();
    const blockRows = input.blocks.map((block) => {
      const blockStartedAt = new Date(cursorMs);
      cursorMs += block.plannedDurationSeconds * 1000;
      return {
        session_id: sessionRow.id,
        category_id: block.categoryId,
        name: block.name,
        color: block.color,
        position: block.position,
        planned_duration_seconds: block.plannedDurationSeconds,
        actual_duration_seconds: block.plannedDurationSeconds,
        status: "completed" as const,
        started_at: blockStartedAt.toISOString(),
        ended_at: new Date(cursorMs).toISOString(),
      };
    });

    const { error: blocksError } = await this.client.from("session_blocks").insert(blockRows);
    if (blocksError) throw blocksError;

    const created = await this.getById(sessionRow.id as SessionId, input.ownerId);
    if (!created) throw new Error("No se pudo crear la sesión.");
    return created;
  }

  async updateBlock(
    id: SessionBlockId,
    ownerId: UserId,
    changes: Partial<
      Pick<SessionBlock, "status" | "actualDurationSeconds" | "startedAt" | "endedAt" | "note">
    >,
  ): Promise<SessionBlock> {
    // RLS ya exige que session_blocks.session_id pertenezca a una sesión del
    // usuario; ownerId se usa aquí solo para ese chequeo indirecto vía RLS,
    // no hace falta filtrarlo explícitamente en la query.
    void ownerId;
    const { data, error } = await this.client
      .from("session_blocks")
      .update({
        status: changes.status,
        actual_duration_seconds: changes.actualDurationSeconds,
        started_at: changes.startedAt?.toISOString(),
        ended_at: changes.endedAt?.toISOString(),
        note: changes.note,
      })
      .eq("id", id)
      .select("*")
      .single();

    if (error) throw error;
    return blockToDomain(data);
  }

  async transitionBlockIfStatus(
    id: SessionBlockId,
    ownerId: UserId,
    expectedStatus: SessionBlock["status"],
    changes: Partial<
      Pick<SessionBlock, "status" | "actualDurationSeconds" | "startedAt" | "endedAt" | "note">
    >,
  ): Promise<SessionBlock | null> {
    void ownerId;
    const { data, error } = await this.client
      .from("session_blocks")
      .update({
        status: changes.status,
        actual_duration_seconds: changes.actualDurationSeconds,
        started_at: changes.startedAt?.toISOString(),
        ended_at: changes.endedAt?.toISOString(),
        note: changes.note,
      })
      .eq("id", id)
      .eq("status", expectedStatus)
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data ? blockToDomain(data) : null;
  }

  async getBlockQstashMessageId(id: SessionBlockId): Promise<string | null> {
    const { data, error } = await this.client
      .from("session_blocks")
      .select("qstash_message_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data?.qstash_message_id ?? null;
  }

  async setBlockQstashMessageId(id: SessionBlockId, messageId: string | null): Promise<void> {
    const { error } = await this.client
      .from("session_blocks")
      .update({ qstash_message_id: messageId })
      .eq("id", id);
    if (error) throw error;
  }

  async getBlockFiveMinQstashMessageId(id: SessionBlockId): Promise<string | null> {
    const { data, error } = await this.client
      .from("session_blocks")
      .select("qstash_five_min_message_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data?.qstash_five_min_message_id ?? null;
  }

  async setBlockFiveMinQstashMessageId(id: SessionBlockId, messageId: string | null): Promise<void> {
    const { error } = await this.client
      .from("session_blocks")
      .update({ qstash_five_min_message_id: messageId })
      .eq("id", id);
    if (error) throw error;
  }

  async setBlockPausedRemainingSeconds(id: SessionBlockId, seconds: number | null): Promise<void> {
    const { error } = await this.client
      .from("session_blocks")
      .update({ paused_remaining_seconds: seconds })
      .eq("id", id);
    if (error) throw error;
  }

  async extendBlock(
    id: SessionBlockId,
    ownerId: UserId,
    extraSeconds: number,
    qstashMessageId: string,
    fiveMinQstashMessageId: string | null,
  ): Promise<void> {
    void ownerId; // RLS ya exige que el bloque pertenezca a una sesión del usuario.
    const { data: current, error: readError } = await this.client
      .from("session_blocks")
      .select("planned_duration_seconds")
      .eq("id", id)
      .single();
    if (readError) throw readError;

    const { error } = await this.client
      .from("session_blocks")
      .update({
        planned_duration_seconds: current.planned_duration_seconds + extraSeconds,
        phase_alert_sent: false,
        phase_reminder_sent: false,
        phase_five_min_alert_sent: false,
        qstash_message_id: qstashMessageId,
        qstash_five_min_message_id: fiveMinQstashMessageId,
      })
      .eq("id", id);
    if (error) throw error;
  }

  async insertBlock(
    sessionId: SessionId,
    ownerId: UserId,
    input: {
      categoryId: CategoryId;
      name: string;
      color: string;
      plannedDurationSeconds: number;
      beforeBlockId: SessionBlockId | null;
    },
  ): Promise<SessionBlock> {
    void ownerId; // RLS ya exige que la sesión pertenezca al usuario.
    const { data: existing, error: existingError } = await this.client
      .from("session_blocks")
      .select("id, position")
      .eq("session_id", sessionId)
      .order("position", { ascending: false });
    if (existingError) throw existingError;

    let targetPosition: number;
    if (input.beforeBlockId === null) {
      targetPosition = (existing[0]?.position ?? -1) + 1;
    } else {
      const beforeBlock = existing.find((row) => row.id === input.beforeBlockId);
      if (!beforeBlock) throw new Error("Bloque de referencia no encontrado.");
      targetPosition = beforeBlock.position;

      // Hueco para el nuevo bloque: se desplazan +1 los que quedan a partir
      // de esa posición, de mayor a menor (uno a uno, no en un solo UPDATE)
      // para no chocar nunca con la unique constraint (session_id, position)
      // — de mayor a menor, cada hueco de destino ya está libre porque el
      // bloque que lo ocupaba se acaba de mover un paso por delante.
      const toShift = existing.filter((row) => row.position >= targetPosition);
      for (const row of toShift) {
        const { error: shiftError } = await this.client
          .from("session_blocks")
          .update({ position: row.position + 1 })
          .eq("id", row.id);
        if (shiftError) throw shiftError;
      }
    }

    const { data, error } = await this.client
      .from("session_blocks")
      .insert({
        session_id: sessionId,
        category_id: input.categoryId,
        name: input.name,
        color: input.color,
        position: targetPosition,
        planned_duration_seconds: input.plannedDurationSeconds,
        status: "pending",
      })
      .select("*")
      .single();
    if (error) throw error;
    return blockToDomain(data);
  }

  async reorderBlocks(
    sessionId: SessionId,
    ownerId: UserId,
    orderedBlockIds: SessionBlockId[],
  ): Promise<void> {
    void ownerId; // RLS ya exige que la sesión pertenezca al usuario.
    const { data: rows, error: rowsError } = await this.client
      .from("session_blocks")
      .select("id, position")
      .eq("session_id", sessionId)
      .in("id", orderedBlockIds);
    if (rowsError) throw rowsError;
    if (rows.length !== orderedBlockIds.length) throw new Error("Bloques no encontrados.");

    const positions = rows.map((row) => row.position).sort((a, b) => a - b);

    // Dos fases para evitar chocar con la unique constraint (session_id,
    // position) al reasignar: primero se mueven todos a posiciones fuera de
    // rango (nunca chocan entre sí ni con el resto de la sesión), luego se
    // asignan las posiciones definitivas ya en el orden pedido.
    for (const row of rows) {
      const { error: tempError } = await this.client
        .from("session_blocks")
        .update({ position: row.position + 100000 })
        .eq("id", row.id);
      if (tempError) throw tempError;
    }

    for (const [i, blockId] of orderedBlockIds.entries()) {
      const { error: finalError } = await this.client
        .from("session_blocks")
        .update({ position: positions[i] })
        .eq("id", blockId);
      if (finalError) throw finalError;
    }
  }

  async deleteBlock(id: SessionBlockId, ownerId: UserId): Promise<void> {
    void ownerId; // RLS ya exige que la sesión pertenezca al usuario.
    const { error } = await this.client
      .from("session_blocks")
      .delete()
      .eq("id", id)
      .eq("status", "pending");
    if (error) throw error;
  }

  async getPublicSummary(id: SessionId): Promise<PublicSessionSummary | null> {
    const { data, error } = await this.client
      .from("sessions")
      .select("started_at, status, session_blocks(id, name, color, actual_duration_seconds, position)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data || data.status === "in_progress") return null;

    return {
      startedAt: new Date(data.started_at),
      status: data.status,
      blocks: [...data.session_blocks]
        .sort((a, b) => a.position - b.position)
        .map((block) => ({
          id: block.id as SessionBlockId,
          name: block.name,
          color: block.color,
          actualDurationSeconds: block.actual_duration_seconds,
        }))
        .filter(hasPracticedTime),
    };
  }

  async finish(
    id: SessionId,
    ownerId: UserId,
    result: { status: Extract<SessionStatus, "completed" | "abandoned">; finalNote: string | null },
  ): Promise<Session> {
    // La duración real de la sesión es la suma de la de sus bloques, no un
    // valor que el cliente pueda mandar — se deriva aquí para no depender
    // de que quien llame la calcule bien.
    const current = await this.getById(id, ownerId);
    const actualDurationSeconds =
      current?.blocks
        .filter(hasPracticedTime)
        .reduce((total, block) => total + block.actualDurationSeconds, 0) ?? 0;

    const { error } = await this.client
      .from("sessions")
      .update({
        status: result.status,
        final_note: result.finalNote,
        actual_duration_seconds: actualDurationSeconds,
        ended_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;

    // No debe tumbar el cierre de la sesión, que ya se guardó bien.
    try {
      await scheduleStreakAlert(ownerId, id);
    } catch (scheduleError) {
      console.error("No se pudo programar el aviso de racha", scheduleError);
    }

    const updated = await this.getById(id, ownerId);
    if (!updated) throw new Error("Sesión no encontrada.");
    return updated;
  }

  async getLinkedSessionId(id: SessionId, ownerId: UserId): Promise<SessionId | null> {
    const { data, error } = await this.client
      .from("sessions")
      .select("linked_session_id")
      .eq("id", id)
      .eq("owner_id", ownerId)
      .maybeSingle();
    if (error) throw error;
    return (data?.linked_session_id as SessionId | null) ?? null;
  }

  async setLinkedSession(
    id: SessionId,
    ownerId: UserId,
    linkedSessionId: SessionId,
    peerUsername: string,
  ): Promise<void> {
    const { error } = await this.client
      .from("sessions")
      .update({ linked_session_id: linkedSessionId, linked_session_peer_username: peerUsername })
      .eq("id", id)
      .eq("owner_id", ownerId);
    if (error) throw error;
  }

  async getBlockPositions(
    blockIds: SessionBlockId[],
  ): Promise<{ id: SessionBlockId; position: number }[]> {
    if (blockIds.length === 0) return [];
    const { data, error } = await this.client
      .from("session_blocks")
      .select("id, position")
      .in("id", blockIds);
    if (error) throw error;
    return data.map((row) => ({ id: row.id as SessionBlockId, position: row.position }));
  }

  async findBlockIdsAtPositions(
    sessionId: SessionId,
    positions: number[],
  ): Promise<{ id: SessionBlockId; position: number }[]> {
    if (positions.length === 0) return [];
    const { data, error } = await this.client
      .from("session_blocks")
      .select("id, position")
      .eq("session_id", sessionId)
      .in("position", positions);
    if (error) throw error;
    return data.map((row) => ({ id: row.id as SessionBlockId, position: row.position }));
  }
}

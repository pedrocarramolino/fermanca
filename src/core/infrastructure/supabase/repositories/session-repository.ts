import type { SupabaseClient } from "@supabase/supabase-js";
import type { Session, SessionBlock, SessionStatus } from "@/core/domain/session";
import type { SessionBlockId, SessionId, TemplateId, UserId } from "@/core/domain/ids";
import type {
  NewSessionBlock,
  SessionHistoryFilter,
  SessionRepository,
} from "@/core/domain/repositories/session-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";

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
    const { error: blocksError } = await this.client.from("session_blocks").insert(
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
    );
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

  async markPhaseAlertSent(id: SessionBlockId, ownerId: UserId): Promise<void> {
    void ownerId; // RLS ya exige que el bloque pertenezca a una sesión del usuario.
    const { error } = await this.client
      .from("session_blocks")
      .update({ phase_alert_sent: true })
      .eq("id", id);
    if (error) throw error;
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
      current?.blocks.reduce((total, block) => total + block.actualDurationSeconds, 0) ?? 0;

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

    const updated = await this.getById(id, ownerId);
    if (!updated) throw new Error("Sesión no encontrada.");
    return updated;
  }
}

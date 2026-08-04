import type { Session, SessionBlock, SessionStatus } from "@/core/domain/session";
import type { SessionBlockId, SessionId, TemplateId, UserId } from "@/core/domain/ids";

export type NewSessionBlock = Omit<
  SessionBlock,
  "id" | "sessionId" | "actualDurationSeconds" | "status" | "startedAt" | "endedAt" | "note"
>;

export interface SessionHistoryFilter {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export interface SessionRepository {
  listByOwner(ownerId: UserId, filter?: SessionHistoryFilter): Promise<Session[]>;
  getById(id: SessionId, ownerId: UserId): Promise<Session | null>;
  start(input: {
    ownerId: UserId;
    templateId: TemplateId | null;
    plannedDurationSeconds: number;
    blocks: NewSessionBlock[];
  }): Promise<Session>;
  updateBlock(
    id: SessionBlockId,
    ownerId: UserId,
    changes: Partial<
      Pick<SessionBlock, "status" | "actualDurationSeconds" | "startedAt" | "endedAt" | "note">
    >,
  ): Promise<SessionBlock>;
  /** El cliente lo llama al mostrar su propio aviso local (app en segundo
   * plano pero con JS aún corriendo), para que el aviso programado por
   * QStash no lo duplique — ver /api/qstash/session-phase-alert. */
  markPhaseAlertSent(id: SessionBlockId, ownerId: UserId): Promise<void>;
  /** Id del mensaje QStash pendiente para el aviso de fin de fase de este
   * bloque, si tiene uno programado. */
  getBlockQstashMessageId(id: SessionBlockId): Promise<string | null>;
  setBlockQstashMessageId(id: SessionBlockId, messageId: string | null): Promise<void>;
  finish(
    id: SessionId,
    ownerId: UserId,
    result: { status: Extract<SessionStatus, "completed" | "abandoned">; finalNote: string | null },
  ): Promise<Session>;
}

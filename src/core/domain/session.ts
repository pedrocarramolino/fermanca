import type { CategoryId, SessionBlockId, SessionId, TemplateId, UserId } from "@/core/domain/ids";

export type SessionStatus = "in_progress" | "completed" | "abandoned";
export type SessionBlockStatus = "pending" | "active" | "completed" | "skipped";

export interface SessionBlock {
  id: SessionBlockId;
  sessionId: SessionId;
  categoryId: CategoryId;
  name: string;
  color: string;
  position: number;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  status: SessionBlockStatus;
  startedAt: Date | null;
  endedAt: Date | null;
  /** Nota rápida que el usuario escribe al terminar el bloque. */
  note: string | null;
}

/** Para el enlace de compartir: nunca incluye notas ni de quién es la
 * sesión — solo lo mismo que ya se muestra en el detalle de un amigo. */
export interface PublicSessionSummary {
  startedAt: Date;
  status: Extract<SessionStatus, "completed" | "abandoned">;
  blocks: {
    id: SessionBlockId;
    name: string;
    color: string;
    actualDurationSeconds: number;
  }[];
}

export interface Session {
  id: SessionId;
  ownerId: UserId;
  /** null si la sesión se improvisó sin partir de una plantilla. */
  templateId: TemplateId | null;
  status: SessionStatus;
  plannedDurationSeconds: number;
  actualDurationSeconds: number;
  startedAt: Date;
  endedAt: Date | null;
  finalNote: string | null;
  blocks: SessionBlock[];
}

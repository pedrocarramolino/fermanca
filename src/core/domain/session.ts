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
  /** Cuánto quedaba en el instante de pausar — null si no está en pausa. */
  pausedRemainingSeconds: number | null;
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

/** Una fase terminada al instante (0s reales) no cuenta como practicada —
 * se usa para excluirla de recuentos y totales sin tener que borrarla ni
 * bloquear que exista. Genérico porque se aplica tanto a `SessionBlock`
 * como a las variantes reducidas que viajan en el resumen público, el
 * detalle de un amigo y el Feed — todas comparten este campo. */
export function hasPracticedTime(block: { actualDurationSeconds: number }): boolean {
  return block.actualDurationSeconds > 0;
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
  /** Sesión gemela de un compañero en una sesión cooperativa — null en una
   * sesión normal en solitario. Cada participante tiene su propia fila
   * `sessions` (ver acceptSessionInvite); esta es la única forma de saber
   * que hay una al otro lado. */
  linkedSessionId: SessionId | null;
  /** Username del compañero, copiado en el momento de enlazar — la RLS de
   * `sessions` es de dueño único, así que nunca se puede leer su fila para
   * sacarlo después. */
  linkedSessionPeerUsername: string | null;
}

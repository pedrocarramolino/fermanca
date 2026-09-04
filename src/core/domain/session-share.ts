import type { ReactionSummary } from "@/core/domain/reaction";
import type { SessionBlockId, SessionId, SessionShareId, UserId } from "@/core/domain/ids";

/** Instantánea de una sesión compartida al feed — mismos campos que
 * PublicSessionSummary (nunca notas), guardados aparte en vez de leídos en
 * vivo de la sesión original (ver comentario de la migración). */
export interface SessionShare {
  id: SessionShareId;
  sessionId: SessionId;
  ownerId: UserId;
  ownerUsername: string;
  ownerAvatarUrl: string | null;
  /** Puesto por quien comparte, opcional — la sesión en sí no tiene título. */
  title: string | null;
  startedAt: Date;
  totalDurationSeconds: number;
  blocks: {
    id: SessionBlockId;
    name: string;
    color: string;
    actualDurationSeconds: number;
  }[];
  createdAt: Date;
  /** Solo los emojis con al menos una reacción — se calcula al listar el
   * feed (tabla aparte, session_share_reactions), no viaja con el resto de
   * la instantánea porque cambia después de compartir, a diferencia del resto. */
  reactions: ReactionSummary[];
}

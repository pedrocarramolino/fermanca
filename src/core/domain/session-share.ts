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
}

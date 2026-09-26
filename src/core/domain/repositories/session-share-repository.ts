import type { SessionShare } from "@/core/domain/session-share";
import type { SessionBlockId, SessionId, SessionShareId, UserId } from "@/core/domain/ids";

export interface SessionShareRepository {
  create(input: {
    sessionId: SessionId;
    ownerId: UserId;
    ownerUsername: string;
    ownerAvatarUrl: string | null;
    title: string | null;
    startedAt: Date;
    totalDurationSeconds: number;
    blocks: { id: SessionBlockId; name: string; color: string; actualDurationSeconds: number }[];
  }): Promise<SessionShare>;
  /** Feed de quien mira: su propio contenido compartido más el de sus
   * amigos aceptados, lo más reciente primero. Tiene que costar lo mismo
   * con 100 usuarios que con 100.000: se lee por autor, nunca la tabla
   * entera filtrada después. */
  listFeed(viewerId: UserId, limit: number): Promise<SessionShare[]>;
  /** Para saber a quién avisar cuando alguien reacciona — null si la
   * publicación ya no existe (se quitó del feed entre medias). */
  getById(id: SessionShareId): Promise<SessionShare | null>;
  /** Para que el botón de la sesión sepa si ya está compartida (y ofrezca
   * "quitar del feed" en vez de "compartir" otra vez). */
  findBySessionId(sessionId: SessionId, ownerId: UserId): Promise<SessionShare | null>;
  remove(id: SessionShareId, ownerId: UserId): Promise<void>;
}

import type { SessionShareId, UserId } from "@/core/domain/ids";

export interface SessionShareReactionRow {
  sessionShareId: SessionShareId;
  ownerId: UserId;
  emoji: string;
}

export interface SessionShareReactionRepository {
  /** Todas las reacciones de varias publicaciones a la vez — para agregar
   * de golpe al listar el feed en vez de una consulta por publicación. */
  listForShares(shareIds: SessionShareId[]): Promise<SessionShareReactionRow[]>;
  /** Quita la reacción si ya existía, la añade si no — devuelve el estado
   * resultante (true = reaccionado). */
  toggle(shareId: SessionShareId, ownerId: UserId, emoji: string): Promise<boolean>;
}

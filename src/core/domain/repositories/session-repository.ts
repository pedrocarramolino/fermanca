import type {
  PublicSessionSummary,
  Session,
  SessionBlock,
  SessionBlockStatus,
  SessionStatus,
} from "@/core/domain/session";
import type { CategoryId, SessionBlockId, SessionId, TemplateId, UserId } from "@/core/domain/ids";

export type NewSessionBlock = Omit<
  SessionBlock,
  | "id"
  | "sessionId"
  | "actualDurationSeconds"
  | "status"
  | "startedAt"
  | "endedAt"
  | "note"
  | "pausedRemainingSeconds"
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
  /** Como updateBlock, pero solo aplica los cambios si el bloque sigue en
   * expectedStatus — evita una doble transición si los dos dispositivos de
   * una sesión cooperativa confirman la misma fase casi a la vez. Devuelve
   * null (sin tocar nada) si el estado ya no coincidía: el compañero ya
   * hizo esta transición. */
  transitionBlockIfStatus(
    id: SessionBlockId,
    ownerId: UserId,
    expectedStatus: SessionBlockStatus,
    changes: Partial<
      Pick<SessionBlock, "status" | "actualDurationSeconds" | "startedAt" | "endedAt" | "note">
    >,
  ): Promise<SessionBlock | null>;
  /** Id del mensaje QStash pendiente para el aviso de fin de fase de este
   * bloque, si tiene uno programado. */
  getBlockQstashMessageId(id: SessionBlockId): Promise<string | null>;
  setBlockQstashMessageId(id: SessionBlockId, messageId: string | null): Promise<void>;
  /** Congela (o libera, con null) cuánto quedaba en el bloque activo al
   * pausarlo — lo lee useSessionRuntime al montarse para reconstruir una
   * pausa que sobrevivió a un cierre de pestaña o a volver a Inicio. */
  setBlockPausedRemainingSeconds(id: SessionBlockId, seconds: number | null): Promise<void>;
  /** Amplía la duración planeada del bloque activo (el usuario pide más
   * tiempo al terminar la fase) y reactiva el aviso de fin de fase para el
   * nuevo plazo. */
  extendBlock(
    id: SessionBlockId,
    ownerId: UserId,
    extraSeconds: number,
    qstashMessageId: string,
  ): Promise<void>;
  /** Inserta una fase nueva entre las que aún no han empezado (siempre
   * `status: 'pending'`) — `beforeBlockId: null` la coloca al final de la
   * cola. Los bloques activos/completados no se tocan. */
  insertBlock(
    sessionId: SessionId,
    ownerId: UserId,
    input: {
      categoryId: CategoryId;
      name: string;
      color: string;
      plannedDurationSeconds: number;
      beforeBlockId: SessionBlockId | null;
    },
  ): Promise<SessionBlock>;
  /** Reordena las fases aún pendientes (mismo mecanismo de arrastrar que en
   * la pantalla de inicio) — `orderedBlockIds` debe ser una permutación
   * exacta de los bloques pendientes actuales; los activos/completados no se
   * tocan. */
  reorderBlocks(
    sessionId: SessionId,
    ownerId: UserId,
    orderedBlockIds: SessionBlockId[],
  ): Promise<void>;
  /** Quita una fase todavía pendiente (deslizar en RemainingPhasesList) —
   * solo borra si sigue en `pending`, nunca una activa o ya completada. */
  deleteBlock(id: SessionBlockId, ownerId: UserId): Promise<void>;
  /** Sin filtrar por dueño — solo para el enlace público de compartir;
   * llamar siempre con el cliente de servicio. Nunca expone notas ni de
   * quién es la sesión, y devuelve null si aún está en curso. */
  getPublicSummary(id: SessionId): Promise<PublicSessionSummary | null>;
  finish(
    id: SessionId,
    ownerId: UserId,
    result: { status: Extract<SessionStatus, "completed" | "abandoned">; finalNote: string | null },
  ): Promise<Session>;
  /** Id de la sesión gemela enlazada (sesión cooperativa) — null si esta
   * sesión es normal, en solitario. */
  getLinkedSessionId(id: SessionId, ownerId: UserId): Promise<SessionId | null>;
  setLinkedSession(
    id: SessionId,
    ownerId: UserId,
    linkedSessionId: SessionId,
    peerUsername: string,
  ): Promise<void>;
  /** Puente "posición, no id" que necesita toda réplica entre sesiones
   * gemelas — los ids de bloque son distintos en cada sesión, pero las
   * posiciones son idénticas por construcción (ver acceptSessionInvite). */
  getBlockPositions(blockIds: SessionBlockId[]): Promise<{ id: SessionBlockId; position: number }[]>;
  findBlockIdsAtPositions(
    sessionId: SessionId,
    positions: number[],
  ): Promise<{ id: SessionBlockId; position: number }[]>;
}

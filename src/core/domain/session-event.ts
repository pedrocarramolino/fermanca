import type { SessionId, UserId } from "@/core/domain/ids";

/** Feed efímero de "quién hizo qué" en una sesión cooperativa — solo para el
 * aviso en vivo en el dispositivo del compañero (ver coop-notice-toast),
 * no un historial persistente. */
export type SessionEventType =
  | "paused"
  | "resumed"
  | "phase_confirmed"
  | "time_extended"
  | "phase_added"
  | "phases_reordered"
  | "phase_removed"
  | "session_finished";

export interface SessionEvent {
  id: string;
  sessionId: SessionId;
  actorId: UserId;
  actorUsername: string;
  type: SessionEventType;
  createdAt: Date;
}

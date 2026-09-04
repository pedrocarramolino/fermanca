import "server-only";
import webpush from "web-push";

export interface PushEndpoint {
  endpoint: string;
  p256dh: string;
  auth: string;
}

let configured = false;

function ensureConfigured() {
  if (configured) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "Faltan las variables VAPID (NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).",
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
}

export interface ReminderPushPayload {
  kind: "reminder";
  title: string;
  body: string;
  url?: string;
}

export interface SessionPhasePushPayload {
  kind: "session-phase";
  title: string;
  body: string;
  sessionId: string;
  /** Controla si el SW añade el botón de acción "Siguiente fase". */
  hasNextPhase: boolean;
}

export interface FriendRequestPushPayload {
  kind: "friend-request";
  title: string;
  body: string;
}

export interface AnnouncementPushPayload {
  kind: "announcement";
  title: string;
  body: string;
}

export interface SessionInvitePushPayload {
  kind: "session-invite";
  title: string;
  body: string;
  inviteId: string;
}

export interface SessionInviteAcceptedPushPayload {
  kind: "session-invite-accepted";
  title: string;
  body: string;
  sessionId: string;
}

export interface SessionCoopNoticePushPayload {
  kind: "session-coop-notice";
  title: string;
  body: string;
  sessionId: string;
}

export interface SessionShareReactionPushPayload {
  kind: "session-share-reaction";
  title: string;
  body: string;
  sessionShareId: string;
}

export type PushPayload =
  | ReminderPushPayload
  | SessionPhasePushPayload
  | FriendRequestPushPayload
  | AnnouncementPushPayload
  | SessionInvitePushPayload
  | SessionInviteAcceptedPushPayload
  | SessionCoopNoticePushPayload
  | SessionShareReactionPushPayload;

/** `expired: true` cuando el servicio push responde 404/410 — la
 * suscripción ya no es válida y hay que borrarla, no reintentar. */
export async function sendPush(
  subscription: PushEndpoint,
  payload: PushPayload,
): Promise<{ ok: boolean; expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { ok: true, expired: false };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const expired = statusCode === 404 || statusCode === 410;
    if (!expired) console.error("Error enviando push", error);
    return { ok: false, expired };
  }
}

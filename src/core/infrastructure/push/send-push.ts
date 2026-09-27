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

export interface SessionPhaseFiveMinAlertPushPayload {
  kind: "session-phase-five-min";
  title: string;
  body: string;
  sessionId: string;
}

export interface StreakAlertPushPayload {
  kind: "streak-alert";
  title: string;
  body: string;
}

export interface WeeklyGoalShareReactionPushPayload {
  kind: "weekly-goal-share-reaction";
  title: string;
  body: string;
  weeklyGoalShareId: string;
}

/** Único aviso push que dispara la actividad de un grupo — ver
 * features/groups/application/actions.ts: acabar una sesión solo se
 * refleja en el muro del grupo, sin avisar; completar el objetivo semanal
 * del grupo sí avisa al resto de miembros. */
export interface GroupWeeklyGoalCompletedPushPayload {
  kind: "group-weekly-goal-completed";
  title: string;
  body: string;
  groupId: string;
  /** Imagen grande en la notificación expandida — solo la pinta Android/
   * Chrome; el resto de plataformas (iOS incluido) la ignora sin más. */
  image?: string;
}

export type PushPayload =
  | ReminderPushPayload
  | SessionPhasePushPayload
  | FriendRequestPushPayload
  | AnnouncementPushPayload
  | SessionInvitePushPayload
  | SessionInviteAcceptedPushPayload
  | SessionCoopNoticePushPayload
  | SessionShareReactionPushPayload
  | SessionPhaseFiveMinAlertPushPayload
  | StreakAlertPushPayload
  | WeeklyGoalShareReactionPushPayload
  | GroupWeeklyGoalCompletedPushPayload;

const MINUTE = 60;
const HOUR = 60 * MINUTE;

/**
 * Con qué prioridad y hasta cuándo tiene sentido entregar cada tipo de aviso.
 *
 * Sin esto, web-push manda todo con prioridad normal y una caducidad de 4
 * semanas. Prioridad normal significa que, con el móvil bloqueado un rato,
 * Android (modo Doze) puede guardarse el aviso hasta su siguiente ventana
 * de mantenimiento, minutos después: justo lo contrario de lo que se quiere
 * al terminar una fase. Y 4 semanas de caducidad significa que un móvil que
 * estaba sin conexión podía recibir "¡fase terminada!" días más tarde.
 *
 * - `high` despierta el móvil al momento. Solo para lo que pierde el sentido
 *   si llega tarde: fases, recordatorios de práctica, invitaciones en vivo.
 * - `ttl` (segundos): pasado ese tiempo sin poder entregarse, el servicio
 *   push lo descarta en vez de entregarlo tarde.
 */
const DELIVERY: Record<PushPayload["kind"], { urgency: "high" | "normal"; ttl: number }> = {
  // Durante una sesión: pasado el momento, avisar ya confunde más que ayuda.
  "session-phase": { urgency: "high", ttl: 5 * MINUTE },
  "session-phase-five-min": { urgency: "high", ttl: 2 * MINUTE },
  "session-coop-notice": { urgency: "high", ttl: 5 * MINUTE },
  "session-invite": { urgency: "high", ttl: HOUR },
  "session-invite-accepted": { urgency: "high", ttl: 15 * MINUTE },
  // Recordatorio de práctica / aviso de calendario, a la hora elegida.
  reminder: { urgency: "high", ttl: HOUR },
  // Útil durante unas horas, no hace falta despertar el móvil.
  "streak-alert": { urgency: "normal", ttl: 4 * HOUR },
  // Novedades: pueden esperar a que el móvil se despierte solo.
  "friend-request": { urgency: "normal", ttl: 24 * HOUR },
  announcement: { urgency: "normal", ttl: 24 * HOUR },
  "session-share-reaction": { urgency: "normal", ttl: 24 * HOUR },
  "weekly-goal-share-reaction": { urgency: "normal", ttl: 24 * HOUR },
  "group-weekly-goal-completed": { urgency: "normal", ttl: 24 * HOUR },
};

/** `expired: true` cuando el servicio push responde 404/410 — la
 * suscripción ya no es válida y hay que borrarla, no reintentar. */
export async function sendPush(
  subscription: PushEndpoint,
  payload: PushPayload,
): Promise<{ ok: boolean; expired: boolean }> {
  ensureConfigured();
  const delivery = DELIVERY[payload.kind];
  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
      { urgency: delivery.urgency, TTL: delivery.ttl },
    );
    return { ok: true, expired: false };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    const expired = statusCode === 404 || statusCode === 410;
    if (!expired) console.error("Error enviando push", error);
    return { ok: false, expired };
  }
}

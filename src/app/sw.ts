import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  // No build-time precache-manifest injection: Next 16's default bundler
  // (Turbopack) isn't supported by @serwist/next's webpack plugin yet, and
  // this file is compiled standalone with esbuild (see scripts/build-sw.mjs).
  // The app shell is cached on first visit instead, via runtimeCaching below.
  precacheEntries: [
    { url: "/", revision: null },
    // Archivo estático en public/, no una ruta de Next — a propósito: una
    // página del App Router necesita sus propios chunks JS para hidratarse,
    // y sin el plugin de precache-manifest (ver comentario de arriba) no hay
    // forma fiable de garantizar que esos chunks estén cacheados. Un HTML
    // estático sin JS de framework no tiene ese problema: funciona offline
    // pase lo que pase. "revision" sube a mano si se edita el contenido.
    { url: "/offline.html", revision: "v1" },
  ],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  // Fase 11: si una navegación (NetworkFirst, ver defaultCache) falla porque
  // no hay red y la ruta nunca se cacheó, sirve offline.html en su lugar en
  // vez del error nativo del navegador.
  fallbacks: {
    entries: [
      {
        url: "/offline.html",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

serwist.addEventListeners();

// El evento 'push' no es parte de Serwist, se escucha aparte. El payload lo
// manda el servidor (endpoints de cron) vía web-push — el mismo shape que
// PushPayload en src/core/infrastructure/push/send-push.ts, duplicado aquí
// porque este archivo se compila aparte con esbuild (ver comentario de
// arriba), no importa módulos del resto de la app.
interface ReminderPushPayload {
  kind: "reminder";
  title: string;
  body: string;
  url?: string;
}

interface SessionPhasePushPayload {
  kind: "session-phase";
  title: string;
  body: string;
  sessionId: string;
  hasNextPhase: boolean;
}

interface FriendRequestPushPayload {
  kind: "friend-request";
  title: string;
  body: string;
}

interface AnnouncementPushPayload {
  kind: "announcement";
  title: string;
  body: string;
}

interface SessionInvitePushPayload {
  kind: "session-invite";
  title: string;
  body: string;
  inviteId: string;
}

interface SessionInviteAcceptedPushPayload {
  kind: "session-invite-accepted";
  title: string;
  body: string;
  sessionId: string;
}

interface SessionCoopNoticePushPayload {
  kind: "session-coop-notice";
  title: string;
  body: string;
  sessionId: string;
}

interface SessionShareReactionPushPayload {
  kind: "session-share-reaction";
  title: string;
  body: string;
  sessionShareId: string;
}

interface SessionPhaseFiveMinAlertPushPayload {
  kind: "session-phase-five-min";
  title: string;
  body: string;
  sessionId: string;
}

interface StreakAlertPushPayload {
  kind: "streak-alert";
  title: string;
  body: string;
}

type IncomingPushPayload =
  | ReminderPushPayload
  | SessionPhasePushPayload
  | FriendRequestPushPayload
  | AnnouncementPushPayload
  | SessionInvitePushPayload
  | SessionInviteAcceptedPushPayload
  | SessionCoopNoticePushPayload
  | SessionShareReactionPushPayload
  | SessionPhaseFiveMinAlertPushPayload
  | StreakAlertPushPayload;

interface ShowNotificationOptions extends NotificationOptions {
  actions?: { action: string; title: string }[];
  vibrate?: number[];
}

// Contador del icono de la app (Badging API — navigator.setAppBadge), solo
// visible con la PWA instalada en la pantalla de inicio (no en una pestaña
// normal del navegador; Safari de iOS lo soporta desde 16.4, Firefox no lo
// soporta en absoluto). El propio service worker se reinicia entre eventos
// push, así que no puede llevar la cuenta en una variable en memoria — se
// guarda en IndexedDB, lo único persistente al alcance de un service worker.
const BADGE_DB_NAME = "fermanca-badge";
const BADGE_STORE_NAME = "kv";
const BADGE_COUNT_KEY = "count";

function openBadgeDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(BADGE_DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(BADGE_STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error as unknown);
  });
}

async function readBadgeCount(): Promise<number> {
  try {
    const db = await openBadgeDb();
    return await new Promise((resolve) => {
      const request = db.transaction(BADGE_STORE_NAME, "readonly").objectStore(BADGE_STORE_NAME).get(BADGE_COUNT_KEY);
      request.onsuccess = () => resolve(typeof request.result === "number" ? request.result : 0);
      request.onerror = () => resolve(0);
    });
  } catch {
    return 0;
  }
}

async function writeBadgeCount(count: number): Promise<void> {
  try {
    const db = await openBadgeDb();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(BADGE_STORE_NAME, "readwrite");
      tx.objectStore(BADGE_STORE_NAME).put(count, BADGE_COUNT_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // Sin IndexedDB no se puede persistir el contador entre reinicios del
    // service worker — el badge de este evento concreto igualmente se
    // habrá puesto bien (ver applyBadge), solo se pierde el acumulado.
  }
}

async function applyBadge(count: number): Promise<void> {
  const nav = self.navigator as Navigator & {
    setAppBadge?: (count?: number) => Promise<void>;
    clearAppBadge?: () => Promise<void>;
  };
  try {
    if (count > 0) {
      await nav.setAppBadge?.(count);
    } else {
      await nav.clearAppBadge?.();
    }
  } catch {
    // Badging API no soportada en este navegador/plataforma — no pasa nada,
    // simplemente no habrá número sobre el icono.
  }
}

async function incrementBadge(): Promise<void> {
  const next = (await readBadgeCount()) + 1;
  await writeBadgeCount(next);
  await applyBadge(next);
}

async function clearBadge(): Promise<void> {
  await writeBadgeCount(0);
  await applyBadge(0);
}

/** Envoltorio de showNotification que además suma 1 al badge del icono —
 * así cada rama del handler de 'push' no tiene que acordarse de hacerlo por
 * su cuenta. */
async function notifyAndBadge(title: string, options: ShowNotificationOptions): Promise<void> {
  await self.registration.showNotification(title, options);
  await incrementBadge();
}

self.addEventListener("push", (event: PushEvent) => {
  const payload: IncomingPushPayload = event.data?.json() ?? {
    kind: "reminder",
    title: "Fermança",
    body: "Tienes un recordatorio.",
  };

  if (payload.kind === "session-phase") {
    const options: ShowNotificationOptions = {
      body: payload.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      tag: "practiceflow-session-phase",
      data: {
        type: "session-phase",
        sessionId: payload.sessionId,
        url: `/session/${payload.sessionId}`,
      },
      actions: payload.hasNextPhase
        ? [{ action: "next-phase", title: "Siguiente fase" }]
        : undefined,
      // El sonido de la notificación lo decide el sistema operativo — la Web
      // Push API no permite adjuntar un audio propio. Esto es lo más cerca
      // que se puede llegar a un "aviso de alarma": vibración con patrón
      // propio (Android la respeta; iOS puede ignorarla) y que la
      // notificación no desaparezca sola hasta que se toque.
      vibrate: [300, 150, 300, 150, 300, 150, 600],
      requireInteraction: true,
    };
    event.waitUntil(notifyAndBadge(payload.title, options));
    return;
  }

  if (payload.kind === "session-phase-five-min") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        tag: "practiceflow-session-phase-five-min",
        data: { url: `/session/${payload.sessionId}` },
        vibrate: [200, 100, 200],
      }),
    );
    return;
  }

  if (payload.kind === "streak-alert") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        tag: "practiceflow-streak-alert",
        data: { url: "/" },
      }),
    );
    return;
  }

  if (payload.kind === "friend-request") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url: "/community" },
        tag: "practiceflow-friend-request",
      }),
    );
    return;
  }

  if (payload.kind === "announcement") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url: "/community" },
        tag: "practiceflow-announcement",
      }),
    );
    return;
  }

  if (payload.kind === "session-invite") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url: "/community" },
        tag: "practiceflow-session-invite",
      }),
    );
    return;
  }

  if (payload.kind === "session-invite-accepted") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url: `/session/${payload.sessionId}` },
        tag: "practiceflow-session-invite-accepted",
      }),
    );
    return;
  }

  if (payload.kind === "session-coop-notice") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url: `/session/${payload.sessionId}` },
        // Tag fijo (no por sesión): un pause/resume seguido del otro
        // reemplaza la notificación anterior en vez de amontonarlas.
        tag: "practiceflow-session-coop-notice",
      }),
    );
    return;
  }

  if (payload.kind === "session-share-reaction") {
    event.waitUntil(
      notifyAndBadge(payload.title, {
        body: payload.body,
        icon: "/icons/icon-192x192.png",
        badge: "/icons/icon-192x192.png",
        data: { url: "/" },
        // Tag por publicación: varias reacciones seguidas a la misma
        // publicación reemplazan la notificación anterior en vez de
        // amontonarlas, mismo motivo que session-coop-notice.
        tag: `practiceflow-reaction-${payload.sessionShareId}`,
      }),
    );
    return;
  }

  event.waitUntil(
    notifyAndBadge(payload.title, {
      body: payload.body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-192x192.png",
      data: { url: payload.url ?? "/" },
      tag: "practiceflow-reminder",
    }),
  );
});

interface NotificationClickData {
  url?: string;
  type?: string;
  sessionId?: string;
}

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  // Tocar una notificación es una de las dos formas de "abrir la app" (la
  // otra es tocar el propio icono, ver el listener de 'message' más abajo)
  // — en cualquiera de las dos se da por vista y se limpia el contador.
  event.waitUntil(clearBadge());
  const data = event.notification.data as NotificationClickData | undefined;
  const url = data?.url ?? "/";

  // Fase de sesión (Fase 12): el botón "Siguiente fase" no navega — la
  // sesión en marcha vive en memoria en la pestaña abierta, así que se le
  // manda un mensaje para que confirme el avance ella misma. Si no hay
  // ninguna pestaña abierta no hay estado que avanzar: se abre la app en la
  // sesión y el usuario confirma a mano desde ahí.
  if (data?.type === "session-phase" && event.action === "next-phase") {
    event.waitUntil(
      (async () => {
        const clientsList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const existing = clientsList.find((c) => "focus" in c);
        if (existing) {
          existing.postMessage({ type: "CONFIRM_NEXT_PHASE", sessionId: data.sessionId });
          await existing.focus();
          return;
        }
        await self.clients.openWindow(url);
      })(),
    );
    return;
  }

  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = clientsList.find((c) => "focus" in c);
      if (existing) {
        await existing.focus();
        if ("navigate" in existing) await existing.navigate(url);
        return;
      }
      await self.clients.openWindow(url);
    })(),
  );
});

// Segunda forma de "dar por vista" el badge: la página lo pide directamente
// al abrirse/pasar a primer plano (ver register-service-worker.tsx), sin
// pasar por tocar una notificación concreta.
self.addEventListener("message", (event: ExtendableMessageEvent) => {
  const data = event.data as { type?: string } | undefined;
  if (data?.type === "CLEAR_BADGE") {
    event.waitUntil(clearBadge());
  }
});

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

type IncomingPushPayload = ReminderPushPayload | SessionPhasePushPayload;

interface ShowNotificationOptions extends NotificationOptions {
  actions?: { action: string; title: string }[];
}

self.addEventListener("push", (event: PushEvent) => {
  const payload: IncomingPushPayload = event.data?.json() ?? {
    kind: "reminder",
    title: "PracticeFlow",
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
    };
    event.waitUntil(self.registration.showNotification(payload.title, options));
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
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

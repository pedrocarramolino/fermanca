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

// Recordatorios (Fase 9): el evento 'push' no es parte de Serwist, se
// escucha aparte. El payload lo manda el endpoint de cron (JSON con
// title/body/url) vía web-push.
interface ReminderPushPayload {
  title: string;
  body: string;
  url?: string;
}

self.addEventListener("push", (event: PushEvent) => {
  const payload: ReminderPushPayload = event.data?.json() ?? {
    title: "PracticeFlow",
    body: "Tienes un recordatorio.",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/icon-192",
      badge: "/icon-192",
      data: { url: payload.url ?? "/" },
      tag: "practiceflow-reminder",
    }),
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  const url = (event.notification.data as { url?: string } | undefined)?.url ?? "/";

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

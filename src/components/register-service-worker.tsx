"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    // Con skipWaiting+clientsClaim (ver sw.ts) el SW nuevo toma el control
    // al instante; sin este reload, una pestaña ya abierta seguiría
    // ejecutando el JS viejo mientras el SW nuevo ya controla sus peticiones.
    //
    // Pero 'controllerchange' salta en DOS casos muy distintos, y solo uno
    // necesita recargar:
    //  - la página ya tenía controlador y lo sustituye uno nuevo (tras un
    //    despliegue): sí, está corriendo JS viejo.
    //  - la página no tenía controlador y el SW recién instalado la reclama
    //    (primera visita): el JS que se está ejecutando YA es el actual, así
    //    que recargar no arregla nada — solo corta de golpe lo que estuviera
    //    en marcha, empezando por la animación de entrada.
    // Se lee ANTES de registrar: después, el SW ya podría haber reclamado la
    // página y el valor diría otra cosa.
    const wasAlreadyControlled = navigator.serviceWorker.controller !== null;

    navigator.serviceWorker.register("/sw.js").catch((error: unknown) => {
      console.error("Service worker registration failed", error);
    });

    let reloaded = false;
    function handleControllerChange() {
      if (!wasAlreadyControlled || reloaded) return;
      reloaded = true;
      window.location.reload();
    }
    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    // Abrir la app (al cargarla o al volver a primer plano tras estar en
    // segundo plano) cuenta como "ya has visto las notificaciones" — se
    // avisa al service worker para que ponga a cero el contador del icono
    // (ver el listener de 'message' en sw.ts; él es quien de verdad guarda
    // el contador en IndexedDB, esta página no lo toca directamente).
    function clearBadge() {
      void navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({ type: "CLEAR_BADGE" });
      });
    }
    function handleVisibilityChange() {
      if (document.visibilityState === "visible") clearBadge();
    }
    clearBadge();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null;
}

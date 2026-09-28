"use client";

import { useEffect } from "react";
import { checkForNewVersion, isStaleVersionError, reloadToNewVersion } from "@/lib/app-version";

/** Cada cuánto, como mucho, se pregunta por la versión al volver a la app. */
const CHECK_INTERVAL_MS = 30_000;

/**
 * Recarga la app cuando se ha quedado con una versión anterior a la que
 * sirve el servidor (ver src/lib/app-version.ts). No pinta nada.
 */
export function StaleVersionGuard() {
  useEffect(() => {
    let lastCheck = Date.now();

    function handleVisibilityChange() {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastCheck < CHECK_INTERVAL_MS) return;
      lastCheck = Date.now();
      void checkForNewVersion();
    }

    // Una acción que falla por esto sin que nadie la capture.
    function handleError(event: ErrorEvent) {
      if (isStaleVersionError(event.error)) reloadToNewVersion();
    }
    function handleRejection(event: PromiseRejectionEvent) {
      if (isStaleVersionError(event.reason)) reloadToNewVersion();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, []);

  return null;
}

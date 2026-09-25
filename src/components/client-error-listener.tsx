"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/error-reporting/report-client-error";

/**
 * Los errores que se escapan de React —en un botón, en un temporizador, en
 * una promesa que nadie espera— no pasan por error.tsx: los avisa esto. No
 * pinta nada.
 */
export function ClientErrorListener() {
  useEffect(() => {
    const onError = (event: ErrorEvent) =>
      reportClientError(event.error ?? event.message, "unhandled");
    const onRejection = (event: PromiseRejectionEvent) =>
      reportClientError(event.reason, "unhandled");
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}

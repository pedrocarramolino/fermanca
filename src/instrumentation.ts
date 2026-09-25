import type { Instrumentation } from "next";

/**
 * Next llama a esto con cualquier error del servidor que no se haya
 * capturado (al renderizar una página, en una ruta de API, en una Server
 * Action o en el proxy) — ver report-server-error.ts, que lo apunta y te
 * manda el correo. Se importa bajo demanda para no cargar Supabase al
 * arrancar cada instancia, solo cuando de verdad falla algo.
 */
export const onRequestError: Instrumentation.onRequestError = async (...args) => {
  const { reportServerRequestError } =
    await import("@/core/infrastructure/error-reporting/report-server-error");
  await reportServerRequestError(...args);
};

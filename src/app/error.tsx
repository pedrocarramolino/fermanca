"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { isNetworkError, reportClientError } from "@/lib/error-reporting/report-client-error";
import { reloadIfStaleVersion } from "@/lib/app-version";

/** Un corte de conexión se reintenta solo una vez: si vuelve a fallar
 * enseguida, se queda en pantalla para no reintentar en bucle. */
const AUTO_RETRY_DELAY_MS = 1_500;
const AUTO_RETRY_COOLDOWN_MS = 30_000;
let lastAutoRetryAt = 0;

export default function ErrorBoundary({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  /** Vuelve a pedir el contenido al servidor y a pintarlo — a diferencia de
   * `reset`, que solo repinta lo que ya había (y tras un corte de conexión
   * no hay nada que repintar). */
  retry: () => void;
}) {
  const network = isNetworkError(error);

  useEffect(() => {
    // Una pestaña de antes del último despliegue: no es un fallo, basta con
    // recargar para coger la versión nueva.
    if (reloadIfStaleVersion(error)) return;
    console.error(error);
    reportClientError(error, "boundary");
  }, [error]);

  // Casi siempre es un instante (el móvil vuelve de segundo plano con la
  // conexión dormida, o pasa de wifi a datos): se reintenta solo en cuanto
  // hay red, sin que la persona tenga que hacer nada.
  useEffect(() => {
    if (!network) return;
    function retry() {
      if (Date.now() - lastAutoRetryAt < AUTO_RETRY_COOLDOWN_MS) return;
      lastAutoRetryAt = Date.now();
      retry();
    }
    const timer = navigator.onLine ? setTimeout(retry, AUTO_RETRY_DELAY_MS) : undefined;
    window.addEventListener("online", retry);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", retry);
    };
  }, [network, retry]);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">
        {network ? "Se ha cortado la conexión" : "Algo ha ido mal"}
      </h1>
      <p className="text-muted-foreground text-sm">
        {network
          ? "No hemos podido conectar con Fermança. Comprueba que tienes internet: en cuanto vuelva, lo intentamos de nuevo solos."
          : "Ha ocurrido un error inesperado. Puedes intentarlo de nuevo."}
      </p>
      <Button type="button" onClick={() => retry()}>
        Reintentar
      </Button>
    </main>
  );
}

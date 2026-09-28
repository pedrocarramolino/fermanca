"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/error-reporting/report-client-error";
import { reloadIfStaleVersion } from "@/lib/app-version";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Una pestaña de antes del último despliegue: no es un fallo, basta con
    // recargar para coger la versión nueva.
    if (reloadIfStaleVersion(error)) return;
    console.error(error);
    reportClientError(error, "boundary");
  }, [error]);

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Algo ha ido mal</h1>
      <p className="text-muted-foreground text-sm">
        Ha ocurrido un error inesperado. Puedes intentarlo de nuevo.
      </p>
      <Button type="button" onClick={reset}>
        Reintentar
      </Button>
    </main>
  );
}

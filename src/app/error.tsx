"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
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

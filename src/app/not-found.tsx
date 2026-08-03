import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Página no encontrada</h1>
      <p className="text-muted-foreground text-sm">
        La página que buscas no existe o se ha movido.
      </p>
      <Button render={<Link href="/" />} nativeButton={false}>
        Volver al inicio
      </Button>
    </main>
  );
}

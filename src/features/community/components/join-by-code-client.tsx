"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendFriendRequestByCode } from "@/features/community/application/actions";

export function JoinByCodeClient({
  code,
  inviterUsername,
  authenticated,
}: {
  code: string;
  inviterUsername: string;
  authenticated: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    authenticated ? "sending" : "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authenticated) return;
    sendFriendRequestByCode(code)
      .then(() => setStatus("sent"))
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error ? error.message : "No se pudo enviar la solicitud.",
        );
        setStatus("error");
      });
  }, [authenticated, code]);

  if (!authenticated) {
    const next = encodeURIComponent(`/community/join/${code}`);
    return (
      <div className="flex w-full flex-col items-center gap-4">
        <p className="text-lg">
          <strong>@{inviterUsername}</strong> te ha invitado a ser su amigo en PracticeFlow.
        </p>
        <div className="flex w-full flex-col gap-2">
          <Button render={<Link href={`/register?next=${next}`} />} nativeButton={false}>
            Crear cuenta y aceptar
          </Button>
          <Button
            type="button"
            variant="outline"
            render={<Link href={`/login?next=${next}`} />}
            nativeButton={false}
          >
            Ya tengo cuenta
          </Button>
        </div>
      </div>
    );
  }

  if (status === "sending" || status === "idle") {
    return (
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="text-muted-foreground size-6 animate-spin" aria-hidden />
        <p className="text-muted-foreground text-sm">Enviando solicitud a @{inviterUsername}…</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3">
        <UserX className="text-muted-foreground size-8" aria-hidden />
        <p className="text-sm">{errorMessage}</p>
        <Button render={<Link href="/community" />} nativeButton={false}>
          Ir a Comunidad
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <UserCheck className="text-primary size-10" aria-hidden />
      <p className="text-lg font-medium">Solicitud enviada a @{inviterUsername}</p>
      <p className="text-muted-foreground text-sm">
        Seréis amigos en cuanto la acepte desde Comunidad.
      </p>
      <Button render={<Link href="/community" />} nativeButton={false}>
        Ir a Comunidad
      </Button>
    </div>
  );
}

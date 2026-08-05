import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { getInviterByCode } from "@/features/community/application/actions";
import { JoinByCodeClient } from "@/features/community/components/join-by-code-client";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "Invitación" };

export default async function JoinByCodePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  // Sin autenticación a propósito: quien abre el enlace puede no tener
  // cuenta todavía. getInviterByCode solo expone el nombre de usuario, nada
  // más — RLS no deja ver perfiles ajenos sin sesión.
  const [inviter, { userId }] = await Promise.all([
    getInviterByCode(code),
    getAuthenticatedUser(),
  ]);

  if (!inviter) {
    return (
      <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-4 p-8 text-center">
        <h1 className="text-xl font-semibold">Código no válido</h1>
        <p className="text-muted-foreground text-sm">
          Este enlace de invitación no existe o ha caducado.
        </p>
        <Button render={<Link href="/" />} nativeButton={false}>
          Ir a PracticeFlow
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-6 p-8 text-center">
      <Link href="/" className="flex flex-col items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-128x128.png" alt="" className="size-14 rounded-2xl" />
        {siteConfig.name}
      </Link>

      <JoinByCodeClient code={code} inviterUsername={inviter.username} authenticated={!!userId} />
    </main>
  );
}

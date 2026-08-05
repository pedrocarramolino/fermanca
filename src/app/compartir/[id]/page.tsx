import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { formatDurationShort } from "@/core/domain/duration";
import { formatSessionDate } from "@/lib/format-date";
import { siteConfig } from "@/config/site";
import type { SessionId } from "@/core/domain/ids";

export const metadata: Metadata = { title: "Sesión de práctica" };

export default async function SharedSessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Sin autenticación a propósito: este enlace está pensado para
  // compartirse fuera de la app. getPublicSummary nunca expone notas ni de
  // quién es la sesión.
  const summary = await new SupabaseSessionRepository(createServiceClient()).getPublicSummary(
    id as SessionId,
  );
  if (!summary) notFound();

  const totalSeconds = summary.blocks.reduce(
    (total, block) => total + block.actualDurationSeconds,
    0,
  );

  return (
    <main className="mx-auto flex min-h-svh max-w-sm flex-col items-center justify-center gap-6 p-8 text-center">
      <Link href="/" className="flex flex-col items-center gap-2 font-semibold tracking-tight">
        <img src="/icons/icon-128x128.png" alt="" className="size-14 rounded-2xl" />
        {siteConfig.name}
      </Link>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Sesión de práctica</h1>
        <p className="text-muted-foreground text-sm">{formatSessionDate(summary.startedAt)}</p>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">
            {formatDurationShort(totalSeconds)} en {summary.blocks.length}{" "}
            {summary.blocks.length === 1 ? "bloque" : "bloques"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2 text-left">
            {summary.blocks.map((block) => (
              <li key={block.id} className="flex items-center gap-3 text-sm">
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: block.color }}
                  aria-hidden
                />
                <span className="flex-1">{block.name}</span>
                <span className="text-muted-foreground font-mono tabular-nums">
                  {formatDurationShort(block.actualDurationSeconds)}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Button render={<Link href="/register" />} nativeButton={false} className="w-full">
        Practica tú también con PracticeFlow
      </Button>
    </main>
  );
}

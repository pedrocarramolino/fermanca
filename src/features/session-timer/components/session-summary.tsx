"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationShort } from "@/core/domain/duration";
import { finishSession } from "@/features/session-timer/application/actions";
import { ShareSessionButton } from "@/features/session-timer/components/share-session-button";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

export function SessionSummary({
  sessionId,
  blocks,
  initialFinalNote = "",
}: {
  sessionId: string;
  blocks: RuntimeBlockInput[];
  initialFinalNote?: string;
}) {
  const [note, setNote] = useState(initialFinalNote);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalSeconds = blocks.reduce((total, block) => total + block.actualDurationSeconds, 0);

  function handleSaveNote() {
    startTransition(async () => {
      await finishSession(sessionId, note || null);
      setSaved(true);
    });
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-2xl font-semibold">Sesión completada</h1>
      <p className="text-muted-foreground">
        Has practicado {formatDurationShort(totalSeconds)} en {blocks.length}{" "}
        {blocks.length === 1 ? "bloque" : "bloques"}.
      </p>

      <ShareSessionButton
        sessionId={sessionId}
        totalSeconds={totalSeconds}
        blockCount={blocks.length}
        blocks={blocks.map((block) => ({
          name: block.name,
          color: block.color,
          actualDurationSeconds: block.actualDurationSeconds,
        }))}
      />

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3 text-left">
            {blocks.map((block) => (
              <li key={block.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-3 text-sm">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: block.color }}
                    aria-hidden
                  />
                  <span className="flex-1">{block.name}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {formatDurationShort(block.actualDurationSeconds)}
                  </span>
                </div>
                {block.note && (
                  <p className="text-muted-foreground pl-6 text-xs italic">
                    &ldquo;{block.note}&rdquo;
                  </p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="flex w-full flex-col gap-2 text-left">
        <Textarea
          value={note}
          onChange={(event) => {
            setNote(event.target.value);
            setSaved(false);
          }}
          placeholder="Nota final de la sesión (opcional)"
          rows={3}
        />
        <Button type="button" variant="secondary" onClick={handleSaveNote} disabled={isPending}>
          {saved ? "Nota guardada" : isPending ? "Guardando…" : "Guardar nota"}
        </Button>
      </div>

      <Button render={<Link href="/" />} nativeButton={false}>
        Volver al inicio
      </Button>
    </main>
  );
}

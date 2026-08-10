"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationShort } from "@/core/domain/duration";
import { finishSession, listGhostCategoryIds } from "@/features/session-timer/application/actions";
import { ShareSessionButton } from "@/features/session-timer/components/share-session-button";
import { CreateStoryOverlay } from "@/features/session-timer/components/create-story-overlay";
import type { RuntimeBlockInput } from "@/features/session-timer/hooks/use-session-runtime";

export function SessionSummary({
  sessionId,
  blocks,
  initialFinalNote = "",
  finishing = false,
}: {
  sessionId: string;
  blocks: RuntimeBlockInput[];
  initialFinalNote?: string;
  finishing?: boolean;
}) {
  const t = useTranslations("SessionSummaryScreen");
  const tStory = useTranslations("StoryCreator");
  const [note, setNote] = useState(initialFinalNote);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [storyOpen, setStoryOpen] = useState(false);
  const [ghostCategoryIds, setGhostCategoryIds] = useState<string[]>([]);

  useEffect(() => {
    void listGhostCategoryIds()
      .then(setGhostCategoryIds)
      .catch(() => {
        // Solo afecta a qué se oculta — si falla, el resumen muestra todo.
      });
  }, []);

  // Los bloques de categorías "fantasma" no cuentan aquí: ni en la lista, ni
  // en el tiempo total, ni en lo que se manda a compartir/Story.
  const visibleBlocks = blocks.filter((block) => !ghostCategoryIds.includes(block.categoryId));
  const totalSeconds = visibleBlocks.reduce((total, block) => total + block.actualDurationSeconds, 0);
  const shareBlocks = visibleBlocks.map((block) => ({
    name: block.name,
    color: block.color,
    actualDurationSeconds: block.actualDurationSeconds,
  }));

  function handleSaveNote() {
    startTransition(async () => {
      await finishSession(sessionId, note || null);
      setSaved(true);
    });
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-8 text-center lg:max-w-lg xl:max-w-xl">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">
        {t("practiced", { duration: formatDurationShort(totalSeconds), count: visibleBlocks.length })}
      </p>

      <div className="flex flex-wrap justify-center gap-2">
        <ShareSessionButton
          sessionId={sessionId}
          totalSeconds={totalSeconds}
          blockCount={visibleBlocks.length}
          blocks={shareBlocks}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => setStoryOpen(true)}>
          <Camera className="size-4" />
          {tStory("trigger")}
        </Button>
      </div>

      {storyOpen && (
        <CreateStoryOverlay
          sessionId={sessionId}
          totalSeconds={totalSeconds}
          blockCount={visibleBlocks.length}
          blocks={shareBlocks}
          onClose={() => setStoryOpen(false)}
        />
      )}

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-base">{t("summaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-3 text-left">
            {visibleBlocks.map((block) => (
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
          placeholder={t("notePlaceholder")}
          rows={3}
        />
        <Button type="button" variant="secondary" onClick={handleSaveNote} disabled={isPending}>
          {saved ? t("noteSaved") : isPending ? t("savingNote") : t("saveNote")}
        </Button>
      </div>

      <Button
        render={<Link href="/" />}
        nativeButton={false}
        disabled={finishing}
        aria-busy={finishing}
      >
        {finishing ? t("finishingSession") : t("backHome")}
      </Button>
    </main>
  );
}

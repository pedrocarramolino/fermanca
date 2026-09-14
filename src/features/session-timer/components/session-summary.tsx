"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, Camera, Repeat, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDurationShort } from "@/core/domain/duration";
import { hasPracticedTime } from "@/core/domain/session";
import { finishSession, listGhostCategoryIds } from "@/features/session-timer/application/actions";
import { startSession } from "@/features/session-builder/application/actions";
import { deleteSession } from "@/features/history/application/actions";
import { ShareSessionButton } from "@/features/session-timer/components/share-session-button";
import { ShareToFeedButton } from "@/features/session-timer/components/share-to-feed-button";
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
  const router = useRouter();
  const [note, setNote] = useState(initialFinalNote);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [storyOpen, setStoryOpen] = useState(false);
  const [ghostCategoryIds, setGhostCategoryIds] = useState<string[]>([]);
  const [isRepeating, startRepeating] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, startDeleting] = useTransition();

  useEffect(() => {
    void listGhostCategoryIds()
      .then(setGhostCategoryIds)
      .catch(() => {
        // Solo afecta a qué se oculta — si falla, el resumen muestra todo.
      });
  }, []);

  // Los bloques de categorías "fantasma" y las fases terminadas a los 0s no
  // cuentan aquí: ni en la lista, ni en el tiempo total, ni en lo que se
  // manda a compartir/Story.
  const visibleBlocks = blocks
    .filter((block) => !ghostCategoryIds.includes(block.categoryId))
    .filter(hasPracticedTime);
  const totalSeconds = visibleBlocks.reduce((total, block) => total + block.actualDurationSeconds, 0);
  const shareBlocks = visibleBlocks.map((block) => ({
    id: block.id,
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

  function handleRepeat() {
    startRepeating(async () => {
      // El plan original (con la duración PLANEADA de cada bloque, no la
      // que se practicó de verdad) — todos los bloques, no solo
      // visibleBlocks: una fase saltada o de categoría fantasma seguía
      // siendo parte del plan que se quiere repetir otro día.
      const draftBlocks = blocks.map((block, position) => ({
        categoryId: block.categoryId,
        name: block.name,
        durationSeconds: block.plannedDurationSeconds,
        color: block.color,
        position,
      }));
      await startSession(null, draftBlocks);
    });
  }

  function handleConfirmDelete() {
    startDeleting(async () => {
      await deleteSession(sessionId);
      router.push("/");
    });
  }

  return (
    <main className="mx-auto flex min-h-svh max-w-md flex-col items-center justify-center gap-6 p-8 text-center lg:max-w-lg xl:max-w-xl">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={t("backHome")}
        render={<Link href="/" />}
        nativeButton={false}
        disabled={finishing}
        aria-busy={finishing}
        className="fixed left-4 z-10"
        style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
      >
        <ArrowLeft className="size-4" />
      </Button>

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
        <ShareToFeedButton sessionId={sessionId} blocks={shareBlocks} />
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

      <div className="flex w-full flex-col gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={handleRepeat}
          disabled={isRepeating}
        >
          <Repeat className="size-4" />
          {isRepeating ? t("repeatingSession") : t("repeatSession")}
        </Button>
        <Button
          className="flex-1"
          render={<Link href="/" />}
          nativeButton={false}
          disabled={finishing}
          aria-busy={finishing}
        >
          {finishing ? t("finishingSession") : t("backHome")}
        </Button>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="size-4" />
        {t("deleteSession")}
      </Button>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("deleteConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? t("deletingSession") : t("deleteConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}

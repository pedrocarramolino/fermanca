"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDurationShort } from "@/core/domain/duration";
import { useSessionDraft } from "@/features/session-builder/hooks/use-session-draft";
import { AddBlockForm } from "@/features/session-builder/components/add-block-form";
import { BlockList } from "@/features/session-builder/components/block-list";
import { logManualSession } from "@/features/history/application/actions";
import type { Category, CustomCategory } from "@/core/domain/category";
import type { Session } from "@/core/domain/session";

/** "YYYY-MM-DDTHH:mm" de ahora mismo en local — max del datetime-local para
 * no dejar registrar una sesión que todavía no ha pasado. */
function nowLocalDateTimeKey(): string {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function LogManualSessionDialog({
  open,
  onOpenChange,
  initialCategories,
  onLogged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCategories: Category[];
  onLogged: (session: Session) => void;
}) {
  const t = useTranslations("ManualSession");
  const [categories, setCategories] = useState(initialCategories);
  const [startedAt, setStartedAt] = useState(nowLocalDateTimeKey());
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const draft = useSessionDraft();

  function reset() {
    draft.clear();
    setStartedAt(nowLocalDateTimeKey());
    setError(null);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  function handleSubmit() {
    if (draft.blocks.length === 0 || !startedAt) return;
    setError(null);
    // datetime-local no lleva zona horaria — se resuelve aquí, en el
    // navegador (que sí sabe la zona real del usuario), a un instante
    // absoluto antes de mandarlo al servidor.
    const startedAtIso = new Date(startedAt).toISOString();

    startTransition(async () => {
      try {
        const session = await logManualSession(startedAtIso, draft.blocksInput);
        onLogged(session);
        handleOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error"));
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* max-h + overflow-y-auto: con varias fases más el selector de
       * categoría, el contenido puede superar la altura del viewport. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="manual-session-date">{t("dateTime")}</Label>
            <Input
              id="manual-session-date"
              type="datetime-local"
              value={startedAt}
              max={nowLocalDateTimeKey()}
              onChange={(event) => setStartedAt(event.target.value)}
              className="w-full sm:w-60"
            />
          </div>

          <AddBlockForm
            categories={categories}
            onCategoryCreated={(category: CustomCategory) =>
              setCategories((prev) => [...prev, category])
            }
            onCategoryUpdated={(category: CustomCategory) =>
              setCategories((prev) => prev.map((c) => (c.id === category.id ? category : c)))
            }
            onCategoryDeleted={(categoryId: string) =>
              setCategories((prev) => prev.filter((c) => c.id !== categoryId))
            }
            onAdd={draft.addBlock}
          />

          <BlockList blocks={draft.blocks} onReorder={draft.reorder} onRemove={draft.removeBlock} />

          <span className="text-muted-foreground text-sm">
            {t("totalDuration")}{" "}
            <span className="text-foreground font-medium">
              {formatDurationShort(draft.totalDurationSeconds)}
            </span>
          </span>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={draft.blocks.length === 0 || !startedAt || isPending}
            onClick={handleSubmit}
          >
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

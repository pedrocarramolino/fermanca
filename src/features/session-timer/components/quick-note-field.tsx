"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { saveBlockNote } from "@/features/session-timer/application/actions";

/** Se remonta con una `key={blockId}` distinta por bloque (ver session-runner),
 * así el estado se reinicia solo al cambiar de bloque sin necesitar un efecto. */
export function QuickNoteField({ blockId, blockName }: { blockId: string; blockName: string }) {
  const t = useTranslations("QuickNote");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await saveBlockNote(blockId, note);
      setSaved(true);
    });
  }

  return (
    <div className="border-border flex w-full max-w-sm flex-col gap-2 rounded-lg border p-3">
      <p className="text-muted-foreground text-xs">{t("label", { name: blockName })}</p>
      <Textarea
        value={note}
        onChange={(event) => {
          setNote(event.target.value);
          setSaved(false);
        }}
        placeholder={t("placeholder")}
        rows={2}
      />
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={handleSave}
        disabled={isPending || !note.trim()}
      >
        {saved ? t("saved") : isPending ? t("saving") : t("save")}
      </Button>
    </div>
  );
}

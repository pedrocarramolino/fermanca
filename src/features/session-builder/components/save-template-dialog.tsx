"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SaveTemplateDialog({
  open,
  onOpenChange,
  onSave,
  defaultName = "",
  title,
  saveLabel,
  savingLabel,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
  defaultName?: string;
  title?: string;
  saveLabel?: string;
  savingLabel?: string;
}) {
  const t = useTranslations("SaveTemplateDialog");
  const [name, setName] = useState(defaultName);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setIsPending(true);
    try {
      await onSave(name.trim());
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title ?? t("createTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-name">{t("name")}</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("namePlaceholder")}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? (savingLabel ?? t("saving")) : (saveLabel ?? t("save"))}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

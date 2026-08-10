"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOM_CATEGORY_COLORS, DEFAULT_CUSTOM_CATEGORY_COLOR } from "@/config/category-colors";
import {
  createCustomCategory,
  updateCustomCategory,
} from "@/features/session-builder/application/actions";
import type { CustomCategory } from "@/core/domain/category";

/** Sin `category` crea una nueva; con `category` la edita — misma UI para
 * ambos, como SaveTemplateDialog con plantillas. Se remonta con
 * `key={category?.id ?? "new"}` desde quien la usa, así el estado inicial ya
 * es el correcto sin necesitar un efecto que lo reinicie. */
export function CategoryDialog({
  open,
  onOpenChange,
  onSaved,
  category = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (category: CustomCategory) => void;
  category?: CustomCategory | null;
}) {
  const t = useTranslations("CategoryDialog");
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState<string>(category?.color ?? DEFAULT_CUSTOM_CATEGORY_COLOR);
  const [isGhost, setIsGhost] = useState(category?.isGhost ?? false);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setIsPending(true);
    try {
      const saved = category
        ? await updateCustomCategory(category.id, name.trim(), color, isGhost)
        : await createCustomCategory(name.trim(), color, isGhost);
      onSaved(saved);
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? t("editTitle") : t("createTitle")}</DialogTitle>
          {!category && <DialogDescription>{t("description")}</DialogDescription>}
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="category-name">{t("name")}</Label>
          <Input
            id="category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>{t("color")}</Label>
          <div className="flex flex-wrap gap-2">
            {CUSTOM_CATEGORY_COLORS.map((option) => (
              <button
                key={option.value}
                type="button"
                aria-label={option.label}
                aria-pressed={color === option.value}
                onClick={() => setColor(option.value)}
                className="ring-offset-background data-[selected]:ring-foreground size-7 rounded-full ring-offset-2 outline-none data-[selected]:ring-2"
                data-selected={color === option.value || undefined}
                style={{ backgroundColor: option.value }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            id="category-ghost"
            checked={isGhost}
            onCheckedChange={(checked) => setIsGhost(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor="category-ghost" className="flex flex-col items-start gap-0.5 font-normal">
            {t("ghostLabel")}
            <span className="text-muted-foreground text-xs font-normal">{t("ghostDescription")}</span>
          </Label>
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending
              ? category
                ? t("saving")
                : t("creating")
              : category
                ? t("save")
                : t("create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

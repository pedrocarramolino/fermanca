"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CUSTOM_CATEGORY_COLORS, DEFAULT_CUSTOM_CATEGORY_COLOR } from "@/config/category-colors";
import { createCustomCategory } from "@/features/session-builder/application/actions";
import type { CustomCategory } from "@/core/domain/category";

export function NewCategoryDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (category: CustomCategory) => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(DEFAULT_CUSTOM_CATEGORY_COLOR);
  const [isPending, setIsPending] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return;
    setIsPending(true);
    try {
      const category = await createCustomCategory(name.trim(), color);
      onCreated(category);
      setName("");
      setColor(DEFAULT_CUSTOM_CATEGORY_COLOR);
      onOpenChange(false);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva categoría</DialogTitle>
          <DialogDescription>
            Ejemplos: Escalas, Improvisación, Respiración, Estudios.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="new-category-name">Nombre</Label>
          <Input
            id="new-category-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label>Color</Label>
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

        <DialogFooter>
          <Button type="button" onClick={handleCreate} disabled={isPending || !name.trim()}>
            {isPending ? "Creando…" : "Crear categoría"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

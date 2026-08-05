"use client";

import { useState } from "react";
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
  title = "Guardar como plantilla",
  saveLabel = "Guardar",
  savingLabel = "Guardando…",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (name: string) => Promise<void>;
  defaultName?: string;
  title?: string;
  saveLabel?: string;
  savingLabel?: string;
}) {
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
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Label htmlFor="template-name">Nombre</Label>
          <Input
            id="template-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Estudio diario"
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button type="button" onClick={handleSave} disabled={isPending || !name.trim()}>
            {isPending ? savingLabel : saveLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

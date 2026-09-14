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
import { cn } from "@/lib/utils";
import { createGroup, type MyGroup } from "@/features/groups/application/actions";
import type { GroupKind } from "@/core/domain/group";

export function CreateGroupDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (group: MyGroup) => void;
}) {
  const t = useTranslations("Groups.create");
  const [name, setName] = useState("");
  const [kind, setKind] = useState<GroupKind>("creator");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setName("");
    setKind("creator");
    setError(null);
  }

  function handleSubmit() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        const group = await createGroup(name, kind);
        onCreated({ id: group.id, name: group.name, kind: group.kind, ownerId: group.ownerId, memberCount: 1 });
        reset();
        onOpenChange(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("error"));
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="group-name">{t("nameLabel")}</Label>
            <Input
              id="group-name"
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("namePlaceholder")}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>{t("kindLabel")}</Label>
            <div className="flex flex-col gap-2">
              {(["creator", "admin"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={kind === option}
                  onClick={() => setKind(option)}
                  className={cn(
                    "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                    kind === option ? "border-primary bg-primary/5" : "border-border hover:bg-muted",
                  )}
                >
                  <span className="text-sm font-medium">{t(`kind.${option}.title`)}</span>
                  <span className="text-muted-foreground text-xs">{t(`kind.${option}.description`)}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" disabled={!name.trim() || isPending} onClick={handleSubmit}>
            {isPending ? t("creating") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { joinGroupByCode } from "@/features/groups/application/actions";

export function JoinGroupDialog({
  open,
  onOpenChange,
  onJoined,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoined: () => void;
}) {
  const t = useTranslations("Groups.join");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function reset() {
    setCode("");
    setError(null);
  }

  function handleSubmit() {
    if (!code.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await joinGroupByCode(code);
        reset();
        onOpenChange(false);
        onJoined();
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

        <div className="flex flex-col gap-2">
          <Label htmlFor="group-code">{t("codeLabel")}</Label>
          <Input
            id="group-code"
            value={code}
            maxLength={6}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder={t("codePlaceholder")}
            className="uppercase"
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button type="button" disabled={!code.trim() || isPending} onClick={handleSubmit}>
            {isPending ? t("joining") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

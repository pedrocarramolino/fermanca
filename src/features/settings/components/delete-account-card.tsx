"use client";

import { useState, useTransition } from "react";
import { AlertTriangle } from "lucide-react";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { deleteMyAccount } from "@/features/settings/application/actions";

export function DeleteAccountCard({ username }: { username: string }) {
  const t = useTranslations("DeleteAccount");
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();

  const canConfirm = confirmText.trim() === username;

  function handleDelete() {
    startTransition(async () => {
      await deleteMyAccount();
    });
  }

  return (
    <>
      <Separator className="my-2" />

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-1.5 text-base">
            <AlertTriangle className="size-4" aria-hidden />
            {t("title")}
          </CardTitle>
          <CardDescription>{t("description")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            {t("cta")}
          </Button>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) setConfirmText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dialogTitle")}</DialogTitle>
            <DialogDescription>
              {t.rich("dialogDescription", {
                username,
                strong: (chunks) => <strong className="text-foreground">{chunks}</strong>,
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-username">{t("usernameLabel")}</Label>
            <Input
              id="confirm-username"
              value={confirmText}
              onChange={(event) => setConfirmText(event.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={!canConfirm || isPending}
              onClick={handleDelete}
            >
              {isPending ? t("confirmDeleting") : t("confirmDelete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
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
import { deleteMyAccount } from "@/features/settings/application/actions";

export function DeleteAccountCard({ username }: { username: string }) {
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
      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive text-base">Zona de peligro</CardTitle>
          <CardDescription>
            Elimina tu cuenta y todos tus datos de forma permanente: sesiones, plantillas,
            amigos y recordatorios incluidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            Eliminar cuenta
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
            <DialogTitle>¿Eliminar tu cuenta?</DialogTitle>
            <DialogDescription>
              Esto borra tu cuenta y todos tus datos para siempre — no se puede deshacer. Escribe{" "}
              <strong className="text-foreground">{username}</strong> para confirmar.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirm-username">Nombre de usuario</Label>
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
              {isPending ? "Eliminando…" : "Eliminar cuenta para siempre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

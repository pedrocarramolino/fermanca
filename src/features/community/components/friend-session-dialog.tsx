"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDurationShort } from "@/core/domain/duration";
import { formatSessionDate } from "@/lib/format-date";
import {
  getFriendLastSession,
  type FriendLastSession,
} from "@/features/community/application/actions";
import type { FriendWithProgress } from "@/features/community/components/friends-list";

const STATUS_LABEL: Record<FriendLastSession["status"], string> = {
  completed: "Completada",
  abandoned: "Abandonada",
};

export function FriendSessionDialog({
  friend,
  open,
  onOpenChange,
}: {
  friend: FriendWithProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [session, setSession] = useState<FriendLastSession | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "empty" | "error">("loading");

  useEffect(() => {
    if (!open || !friend) return;
    setStatus("loading");
    setSession(null);
    getFriendLastSession(friend.ownerId)
      .then((result) => {
        setSession(result);
        setStatus(result ? "loaded" : "empty");
      })
      .catch(() => setStatus("error"));
  }, [open, friend]);

  const totalSeconds =
    session?.blocks.reduce((total, block) => total + block.actualDurationSeconds, 0) ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{friend?.username ?? "Última sesión"}</DialogTitle>
          {session && (
            <DialogDescription>
              {formatSessionDate(new Date(session.startedAt))} · {STATUS_LABEL[session.status]}
            </DialogDescription>
          )}
        </DialogHeader>

        {status === "loading" && <p className="text-muted-foreground text-sm">Cargando…</p>}
        {status === "empty" && (
          <p className="text-muted-foreground text-sm">Todavía no tiene sesiones completadas.</p>
        )}
        {status === "error" && (
          <p className="text-destructive text-sm">No se pudo cargar la sesión.</p>
        )}

        {session && (
          <div className="flex flex-col gap-3">
            <ul className="flex flex-col gap-2">
              {session.blocks.map((block) => (
                <li key={block.id} className="flex items-center gap-3 text-sm">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: block.color }}
                    aria-hidden
                  />
                  <span className="flex-1">{block.name}</span>
                  <span className="text-muted-foreground font-mono tabular-nums">
                    {formatDurationShort(block.actualDurationSeconds)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-border flex items-center justify-between border-t pt-3 text-sm font-medium">
              <span>Total</span>
              <span className="font-mono tabular-nums">{formatDurationShort(totalSeconds)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

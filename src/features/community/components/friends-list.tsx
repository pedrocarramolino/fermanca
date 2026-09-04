"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Flame, Trophy, UserMinus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDurationShort } from "@/core/domain/duration";
import { removeFriendship } from "@/features/community/application/actions";
import type { Friend } from "@/core/domain/friendship";
import type { FriendProgress } from "@/features/community/application/actions";

export type FriendWithProgress = Friend & FriendProgress;

/** Overlay propio (no otro `<Dialog>`) a propósito: este visor puede abrirse
 * desde dentro del diálogo de sesiones recientes de un amigo, que ya es un
 * `<Dialog>` abierto — anidar ahí el `<Dialog>` de base-ui dejaba tanto el
 * visor como el diálogo de debajo con opacidad 0 en pruebas (su lógica de
 * diálogos anidados no encaja con las clases de animación que usa este
 * proyecto). Un overlay corriente, portal a `body`, evita ese riesgo. */
function AvatarLightbox({
  src,
  username,
  onClose,
}: {
  src: string;
  username: string;
  onClose: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={username}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div className="relative w-full max-w-xs" onClick={(event) => event.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" className="aspect-square w-full rounded-xl object-cover" />
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="bg-background/80 text-foreground hover:bg-background focus-visible:ring-ring/50 absolute top-2 right-2 flex size-7 items-center justify-center rounded-full focus-visible:ring-3 focus-visible:outline-none"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>,
    document.body,
  );
}

/** Sin foto no hay nada que ampliar, así que se queda como `span` inerte;
 * con foto se convierte en botón para no anidarlo dentro de otro `<button>`
 * (la fila de amigos ya es uno) y poder abrir el visor a tamaño grande. */
export function FriendAvatar({
  username,
  avatarUrl,
  className,
}: {
  username: string;
  avatarUrl: string | null;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!avatarUrl) {
    return (
      <span
        className={cn(
          "border-border bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border",
          className,
        )}
      >
        <span className="text-muted-foreground text-xs font-medium">
          {username.slice(0, 2).toUpperCase()}
        </span>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setExpanded(true);
        }}
        className={cn(
          "border-border bg-muted focus-visible:ring-ring/50 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border focus-visible:ring-3 focus-visible:outline-none",
          className,
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      </button>
      {expanded && (
        <AvatarLightbox src={avatarUrl} username={username} onClose={() => setExpanded(false)} />
      )}
    </>
  );
}

export function FriendsList({
  friends,
  onRemoved,
  onSelectFriend,
}: {
  friends: FriendWithProgress[];
  onRemoved: (friendshipId: string) => void;
  onSelectFriend: (friend: FriendWithProgress) => void;
}) {
  const t = useTranslations("Community.friends");
  const tStreaks = useTranslations("Streaks");
  const [isPending, startTransition] = useTransition();
  const [removingFriend, setRemovingFriend] = useState<FriendWithProgress | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);

  function handleConfirmRemove() {
    if (!removingFriend) return;
    const friendshipId = removingFriend.friendshipId;
    startTransition(async () => {
      try {
        await removeFriendship(friendshipId);
        onRemoved(friendshipId);
        setRemovingFriend(null);
        setRemoveError(null);
      } catch {
        setRemoveError(t("removeError"));
      }
    });
  }

  if (friends.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  const sorted = [...friends].sort((a, b) => b.weeklySeconds - a.weeklySeconds);

  return (
    <>
      <ul className="flex flex-col gap-2">
        {sorted.map((friend, index) => (
          <li
            key={friend.friendshipId}
            className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
          >
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <FriendAvatar username={friend.username} avatarUrl={friend.avatarUrl} />
              <button
                type="button"
                className="focus-visible:ring-ring/50 flex min-w-0 flex-col items-start gap-1 rounded-lg text-left focus-visible:ring-3 focus-visible:outline-none"
                onClick={() => onSelectFriend(friend)}
              >
                <span className="flex min-w-0 max-w-full items-center gap-1.5 font-medium">
                  {index === 0 && friend.weeklySeconds > 0 && (
                    <Trophy className="text-primary size-4 shrink-0" aria-hidden />
                  )}
                  <span className="truncate">{friend.username}</span>
                </span>
                <div className="text-muted-foreground flex items-center gap-3 text-sm">
                  <span>
                    {formatDurationShort(friend.weeklySeconds)} {t("thisWeek")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="size-3.5" />
                    {tStreaks("days", { count: friend.currentStreak })}
                  </span>
                </div>
              </button>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("remove", { name: friend.username })}
              disabled={isPending}
              onClick={() => {
                setRemoveError(null);
                setRemovingFriend(friend);
              }}
            >
              <UserMinus className="size-4" />
            </Button>
          </li>
        ))}
      </ul>

      <Dialog
        open={removingFriend !== null}
        onOpenChange={(open) => {
          if (!open) {
            setRemovingFriend(null);
            setRemoveError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("removeConfirmTitle", { name: removingFriend?.username ?? "" })}
            </DialogTitle>
            <DialogDescription>{removeError ?? t("removeConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isPending}
              onClick={handleConfirmRemove}
            >
              {isPending ? t("removing") : t("removeConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

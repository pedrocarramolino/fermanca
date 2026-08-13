"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDurationShort } from "@/core/domain/duration";
import { formatSessionDate } from "@/lib/format-date";
import {
  getFriendRecentSessions,
  getFriendsOfFriend,
  sendFriendRequestToUser,
  type FriendSession,
  type FriendOfFriend,
} from "@/features/community/application/actions";
import type { Locale } from "@/core/domain/user-settings";
import type { FriendWithProgress } from "@/features/community/components/friends-list";

function sessionTotalSeconds(session: FriendSession): number {
  return session.blocks.reduce((total, block) => total + block.actualDurationSeconds, 0);
}

/** Fases de una sesión ya expandida — misma fila que antes mostraba la
 * única "última sesión", ahora reutilizada para cualquiera de las 3. */
function SessionBlockList({ session }: { session: FriendSession }) {
  const t = useTranslations("Community.session");

  return (
    <div className="flex flex-col gap-2 pt-1 pb-2 pl-1">
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
      <div className="border-border flex items-center justify-between border-t pt-2 text-sm font-medium">
        <span>{t("total")}</span>
        <span className="font-mono tabular-nums">
          {formatDurationShort(sessionTotalSeconds(session))}
        </span>
      </div>
    </div>
  );
}

/** Se remonta con `key={friend.ownerId}` (ver más abajo), así el estado
 * inicial "loading" ya es correcto para el nuevo amigo sin necesitar un
 * efecto que lo reinicie a mano al cambiar de `friend`. */
function FriendSessionContent({ friend }: { friend: FriendWithProgress }) {
  const t = useTranslations("Community.session");
  const tHistory = useTranslations("SessionHistory");
  const tFriends = useTranslations("Community.friendsOfFriend");
  const locale = useLocale() as Locale;
  const [sessions, setSessions] = useState<FriendSession[] | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "empty" | "error">("loading");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [friendsOfFriend, setFriendsOfFriend] = useState<FriendOfFriend[] | null>(null);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    getFriendRecentSessions(friend.ownerId)
      .then((result) => {
        setSessions(result);
        setStatus(result.length > 0 ? "loaded" : "empty");
      })
      .catch(() => setStatus("error"));
    getFriendsOfFriend(friend.ownerId)
      .then(setFriendsOfFriend)
      .catch(() => setFriendsOfFriend([]));
  }, [friend.ownerId]);

  function handleAddFriend(ownerId: string) {
    setSendingTo(ownerId);
    sendFriendRequestToUser(ownerId)
      .then(() => {
        setFriendsOfFriend((prev) =>
          prev?.map((f) => (f.ownerId === ownerId ? { ...f, relationship: "pending" } : f)) ?? null,
        );
      })
      .catch(() => {
        // El botón se queda en "Añadir" y el usuario puede reintentarlo.
      })
      .finally(() => setSendingTo(null));
  }

  const STATUS_LABEL: Record<FriendSession["status"], string> = {
    completed: tHistory("statusCompleted"),
    abandoned: tHistory("statusAbandoned"),
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{friend.username}</DialogTitle>
        <DialogDescription>
          {t("monthTotal", { duration: formatDurationShort(friend.monthlySeconds) })}
        </DialogDescription>
      </DialogHeader>

      {status === "loading" && <p className="text-muted-foreground text-sm">{t("loading")}</p>}
      {status === "empty" && <p className="text-muted-foreground text-sm">{t("empty")}</p>}
      {status === "error" && <p className="text-destructive text-sm">{t("error")}</p>}

      {sessions && sessions.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-muted-foreground text-sm font-medium">{t("recentSessions")}</p>
          <ul className="flex flex-col gap-1">
            {sessions.map((session) => {
              const expanded = expandedId === session.id;
              return (
                <li key={session.id} className="border-border rounded-lg border">
                  <button
                    type="button"
                    className="hover:bg-muted flex w-full flex-col gap-2 rounded-lg p-3 text-left transition-colors"
                    onClick={() => setExpandedId(expanded ? null : session.id)}
                    aria-expanded={expanded}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">
                        {formatSessionDate(new Date(session.startedAt), locale)}
                      </span>
                      <Badge variant={session.status === "completed" ? "secondary" : "outline"}>
                        {STATUS_LABEL[session.status]}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {session.blocks.map((block) => (
                        <span
                          key={block.id}
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: block.color }}
                          aria-hidden
                        />
                      ))}
                      <span className="text-muted-foreground text-xs">
                        {tHistory("blocksCount", { count: session.blocks.length })} ·{" "}
                        {formatDurationShort(sessionTotalSeconds(session))}
                      </span>
                    </div>
                  </button>
                  {expanded && (
                    <div className="border-border border-t px-3">
                      <SessionBlockList session={session} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {friendsOfFriend && friendsOfFriend.length > 0 && (
        <div className="border-border flex flex-col gap-2 border-t pt-3">
          <p className="text-sm font-medium">
            {tFriends("title", { name: friend.username })}
          </p>
          <ul className="flex flex-col gap-2">
            {friendsOfFriend.map((fof) => (
              <li key={fof.ownerId} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate">{fof.username}</span>
                {fof.relationship === "accepted" && (
                  <span className="text-muted-foreground text-xs">{tFriends("alreadyFriends")}</span>
                )}
                {fof.relationship === "pending" && (
                  <span className="text-muted-foreground text-xs">{tFriends("pending")}</span>
                )}
                {fof.relationship === "none" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={sendingTo === fof.ownerId}
                    onClick={() => handleAddFriend(fof.ownerId)}
                  >
                    <UserPlus className="size-3.5" />
                    {sendingTo === fof.ownerId ? tFriends("sending") : tFriends("add")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

export function FriendSessionDialog({
  friend,
  open,
  onOpenChange,
}: {
  friend: FriendWithProgress | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Community.session");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Sesiones recientes + amigos de un amigo pueden sumar más alto que
          la pantalla (varias sesiones, cada una expandible, más una lista
          larga de terceros) — sin límite de altura el diálogo se salía del
          viewport en vez de dejar hacer scroll. */}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        {friend ? (
          <FriendSessionContent key={friend.ownerId} friend={friend} />
        ) : (
          <DialogHeader>
            <DialogTitle>{t("recentSessions")}</DialogTitle>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}

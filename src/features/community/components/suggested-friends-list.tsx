"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendFriendRequestToUser } from "@/features/community/application/actions";
import type { SuggestedFriend } from "@/features/community/application/actions";

function SuggestedAvatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  return (
    <span className="border-border bg-muted flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-muted-foreground text-xs font-medium">
          {username.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}

/** "Amigos de tus amigos" en Comunidad — para no depender siempre de
 * compartir el código/enlace de invitación. Una vez enviada la solicitud,
 * la fila desaparece de aquí (ya no es "sugerencia", es una solicitud en
 * curso). */
export function SuggestedFriendsList({ suggestions }: { suggestions: SuggestedFriend[] }) {
  const t = useTranslations("Community.suggestions");
  const [list, setList] = useState(suggestions);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (list.length === 0) return null;

  function handleAdd(ownerId: string) {
    setSendingId(ownerId);
    startTransition(async () => {
      try {
        await sendFriendRequestToUser(ownerId);
        setList((prev) => prev.filter((s) => s.ownerId !== ownerId));
      } finally {
        setSendingId(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-foreground text-base font-semibold">{t("title")}</h2>
      <ul className="flex flex-col gap-2">
        {list.map((suggestion) => (
          <li
            key={suggestion.ownerId}
            className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
          >
            <div className="flex min-w-0 items-center gap-3">
              <SuggestedAvatar username={suggestion.username} avatarUrl={suggestion.avatarUrl} />
              <div className="flex min-w-0 flex-col">
                <span className="truncate font-medium">@{suggestion.username}</span>
                <span className="text-muted-foreground text-xs">
                  {t("mutualCount", { count: suggestion.mutualCount })}
                </span>
              </div>
            </div>
            <Button
              type="button"
              size="icon-sm"
              aria-label={t("add", { name: suggestion.username })}
              disabled={isPending && sendingId === suggestion.ownerId}
              onClick={() => handleAdd(suggestion.ownerId)}
            >
              <UserPlus className="size-4" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

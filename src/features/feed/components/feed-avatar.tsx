/** Compartido entre FeedItem (sesión) y WeeklyGoalFeedItem (objetivo
 * semanal) — ambos tipos de publicación muestran el mismo encabezado de
 * autor. */
export function FeedAvatar({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
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

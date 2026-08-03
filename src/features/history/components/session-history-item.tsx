import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDurationShort } from "@/core/domain/duration";
import { formatSessionDate } from "@/lib/format-date";
import type { Session } from "@/core/domain/session";

const STATUS_LABEL: Record<Session["status"], string> = {
  completed: "Completada",
  abandoned: "Abandonada",
  in_progress: "En curso",
};

export function SessionHistoryItem({ session }: { session: Session }) {
  const duration =
    session.status === "in_progress"
      ? session.plannedDurationSeconds
      : session.actualDurationSeconds;

  return (
    <Link
      href={`/session/${session.id}`}
      className="border-border hover:bg-muted flex flex-col gap-2 rounded-lg border p-3 transition-colors"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium">{formatSessionDate(session.startedAt)}</span>
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
          {session.blocks.length} {session.blocks.length === 1 ? "bloque" : "bloques"} ·{" "}
          {formatDurationShort(duration)}
        </span>
      </div>

      {session.finalNote && (
        <p className="text-muted-foreground text-sm italic">&ldquo;{session.finalNote}&rdquo;</p>
      )}
    </Link>
  );
}

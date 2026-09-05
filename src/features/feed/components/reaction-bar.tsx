"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { REACTION_EMOJIS, type ReactionEmoji, type ReactionSummary } from "@/core/domain/reaction";
import { cn } from "@/lib/utils";

/** Los 5 emojis posibles se muestran siempre, con o sin reacciones — así se
 * puede reaccionar directamente sin un selector aparte, y el que ya tiene
 * alguna reacción se distingue por el recuento junto al emoji. Compartido
 * entre FeedItem y WeeklyGoalFeedItem: la barra en sí no sabe si está
 * reaccionando a una sesión o a un objetivo, solo emite el emoji tocado. */
export function ReactionBar({
  reactions,
  onToggle,
}: {
  reactions: ReactionSummary[];
  onToggle: (emoji: ReactionEmoji) => void;
}) {
  const t = useTranslations("Feed");

  return (
    <div className="flex flex-wrap gap-1.5">
      {REACTION_EMOJIS.map((emoji) => {
        const summary = reactions.find((r) => r.emoji === emoji);
        const count = summary?.count ?? 0;
        const reactedByMe = summary?.reactedByMe ?? false;
        return (
          <button
            key={emoji}
            type="button"
            onClick={() => onToggle(emoji)}
            aria-pressed={reactedByMe}
            aria-label={t("react", { emoji })}
            className={cn(
              "focus-visible:ring-ring/50 flex items-center gap-1 rounded-full border px-2 py-1 text-xs transition-colors focus-visible:ring-3 focus-visible:outline-none",
              reactedByMe
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            <span aria-hidden>{emoji}</span>
            {count > 0 && <span className="tabular-nums">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}

/** Cuántos nombres como mucho se listan por emoji antes de colapsar el
 * resto en "y N más" — con ~50 personas registradas, un emoji popular podría
 * si no acabar en una línea larguísima que se parte mal en una tarjeta
 * estrecha. */
const MAX_REACTOR_NAMES = 3;

/** Solo para quien publicó: quién ha reaccionado con cada emoji.
 * `reactedByUsernames` viene undefined para cualquiera que no sea el dueño
 * (ver ReactionSummary), así que este componente ya sale vacío por su
 * cuenta cuando no toca mostrarlo — no hace falta que quien lo usa decida.
 * "y N más" se puede tocar para desplegar el resto de esa fila en concreto
 * (cada emoji lleva su propio estado, no hay un "todo expandido" global). */
export function ReactionDetails({ reactions }: { reactions: ReactionSummary[] }) {
  const t = useTranslations("Feed");
  const [expandedEmojis, setExpandedEmojis] = useState<Set<string>>(new Set());
  const withNames = reactions.filter((r) => r.reactedByUsernames && r.reactedByUsernames.length > 0);
  if (withNames.length === 0) return null;

  function expand(emoji: string) {
    setExpandedEmojis((prev) => new Set(prev).add(emoji));
  }

  return (
    <p className="text-muted-foreground flex flex-wrap items-baseline gap-x-1 text-xs">
      {withNames.map((r, index) => {
        const names = r.reactedByUsernames!;
        const isExpanded = expandedEmojis.has(r.emoji);
        const visible = isExpanded ? names : names.slice(0, MAX_REACTOR_NAMES);
        const extra = names.length - visible.length;
        return (
          <span key={r.emoji}>
            {index > 0 && <span className="mr-1">·</span>}
            {r.emoji} {visible.join(", ")}
            {extra > 0 && (
              <button
                type="button"
                className="text-foreground ml-1 underline underline-offset-2 hover:no-underline"
                onClick={() => expand(r.emoji)}
              >
                {t("andMore", { count: extra })}
              </button>
            )}
          </span>
        );
      })}
    </p>
  );
}

/** Conjunto fijo de emojis con los que se puede reaccionar a una
 * publicación del Feed — coincide con el check de la columna `emoji` en
 * session_share_reactions, así que cambiar esta lista implica cambiar
 * también la migración. */
export const REACTION_EMOJIS = ["👍", "🔥", "👏", "❤️", "💪"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export function isReactionEmoji(value: string): value is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(value);
}

/** Recuento de reacciones con un emoji concreto en una publicación —
 * `count === 0` no se representa: si nadie ha reaccionado así, el emoji
 * simplemente no aparece en la lista. */
export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
  reactedByMe: boolean;
}

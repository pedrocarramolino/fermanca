import "server-only";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import type { UserId } from "@/core/domain/ids";

/**
 * Todas las personas con las que `userId` tiene un bloqueo, en cualquier
 * sentido: las que ha bloqueado y las que le han bloqueado a él. Con la
 * clave de servicio porque RLS solo deja ver los bloqueos propios, y aquí
 * hacen falta los dos para que ninguno de los dos vea al otro. El resultado
 * nunca sale al navegador tal cual (solo sirve para filtrar), así que nadie
 * puede usarlo para averiguar quién le ha bloqueado.
 */
export async function getBlockedIdsFor(userId: UserId): Promise<Set<UserId>> {
  const { data, error } = await createServiceClient()
    .from("user_blocks")
    .select("blocker_id, blocked_id")
    .or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  if (error) throw error;
  return new Set(
    data.map((row) => (row.blocker_id === userId ? row.blocked_id : row.blocker_id) as UserId),
  );
}

export async function isBlockedBetween(a: UserId, b: UserId): Promise<boolean> {
  const { count, error } = await createServiceClient()
    .from("user_blocks")
    .select("blocker_id", { count: "exact", head: true })
    .or(`and(blocker_id.eq.${a},blocked_id.eq.${b}),and(blocker_id.eq.${b},blocked_id.eq.${a})`);
  if (error) throw error;
  return (count ?? 0) > 0;
}

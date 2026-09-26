import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import type { UserId } from "@/core/domain/ids";
import { sendPush, type PushPayload } from "@/core/infrastructure/push/send-push";

/** Envíos push a la vez. Cada uno tarda unos cientos de ms esperando al
 * servicio push de Apple/Google, así que en serie 1.000 dispositivos eran
 * minutos; con 25 en paralelo son segundos, sin abrir cientos de conexiones
 * de golpe. */
const CONCURRENCY = 25;
/** Supabase devuelve como mucho 1.000 filas por consulta: sin paginar, del
 * dispositivo 1.001 en adelante no se enteraban de nada, y sin ningún error. */
const PAGE_SIZE = 1_000;
/** Ids por consulta `.in()` — van en la URL, así que se trocean. */
const IDS_PER_QUERY = 100;

type SubscriptionRow = { endpoint: string; p256dh: string; auth: string };

export type PushAudience =
  /** Todos los dispositivos de estos usuarios. */
  | { ownerIds: UserId[] }
  /** Todos los dispositivos de la app menos los de este usuario (anuncios). */
  | { everyoneExcept: UserId };

/**
 * Manda el mismo aviso a muchos dispositivos: pagina las suscripciones, las
 * envía en paralelo con un tope y, al final, borra de una vez las que el
 * servicio push dio por muertas. Necesita el cliente con clave secreta: lee
 * suscripciones de otros usuarios.
 */
export async function sendPushToMany(
  serviceClient: SupabaseClient<Database>,
  audience: PushAudience,
  payload: PushPayload,
): Promise<{ sent: number; expired: number }> {
  const subscriptions = await loadSubscriptions(serviceClient, audience);

  let sent = 0;
  const expiredEndpoints: string[] = [];
  let next = 0;
  async function worker() {
    while (next < subscriptions.length) {
      const sub = subscriptions[next++]!;
      const result = await sendPush(sub, payload);
      if (result.ok) sent += 1;
      if (result.expired) expiredEndpoints.push(sub.endpoint);
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, subscriptions.length) }, worker));

  for (let i = 0; i < expiredEndpoints.length; i += IDS_PER_QUERY) {
    const { error } = await serviceClient
      .from("push_subscriptions")
      .delete()
      .in("endpoint", expiredEndpoints.slice(i, i + IDS_PER_QUERY));
    if (error) throw error;
  }

  return { sent, expired: expiredEndpoints.length };
}

async function loadSubscriptions(
  serviceClient: SupabaseClient<Database>,
  audience: PushAudience,
): Promise<SubscriptionRow[]> {
  if ("everyoneExcept" in audience) {
    const rows: SubscriptionRow[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await serviceClient
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .neq("owner_id", audience.everyoneExcept)
        // Orden estable: sin él, las páginas pueden solaparse o saltarse filas.
        .order("id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw error;
      rows.push(...data);
      if (data.length < PAGE_SIZE) return rows;
    }
  }

  const chunks: UserId[][] = [];
  for (let i = 0; i < audience.ownerIds.length; i += IDS_PER_QUERY) {
    chunks.push(audience.ownerIds.slice(i, i + IDS_PER_QUERY));
  }
  const pages = await Promise.all(
    chunks.map(async (ownerIds) => {
      const { data, error } = await serviceClient
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .in("owner_id", ownerIds);
      if (error) throw error;
      return data;
    }),
  );
  return pages.flat();
}

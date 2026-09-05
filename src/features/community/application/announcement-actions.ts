"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseAnnouncementRepository } from "@/core/infrastructure/supabase/repositories/announcement-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";
import { UnauthorizedError } from "@/core/domain/errors";
import { canEditAnnouncement } from "@/core/domain/announcement";
import type { AnnouncementId, UserId } from "@/core/domain/ids";

const NOTIFICATION_BODY_LIMIT = 150;
/** El tablón solo enseña los últimos 3 — no es un historial, es "qué está
 * pasando ahora"; anuncios más viejos ya cumplieron su función. */
const BOARD_LIST_LIMIT = 3;

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

/** Avisa a todos los dispositivos suscritos salvo los de quien publica —
 * con la clave de servicio, porque hace falta leer suscripciones de
 * cualquier usuario, no solo la propia (igual que notifyFriendRequest en
 * community/application/actions.ts). */
async function notifyAnnouncementSubscribers(authorId: UserId, body: string) {
  const serviceClient = createServiceClient();
  const { data: subscriptions, error } = await serviceClient
    .from("push_subscriptions")
    .select("*")
    .neq("owner_id", authorId);
  if (error) throw error;

  const truncatedBody =
    body.length > NOTIFICATION_BODY_LIMIT
      ? `${body.slice(0, NOTIFICATION_BODY_LIMIT)}…`
      : body;

  const pushRepo = new SupabasePushSubscriptionRepository(serviceClient);
  for (const sub of subscriptions) {
    const result = await sendPush(
      { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
      { kind: "announcement", title: "Nuevo anuncio en Fermança", body: truncatedBody },
    );
    if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
  }
}

export async function listAnnouncements() {
  const { client } = await requireUserId();
  return new SupabaseAnnouncementRepository(client).list(BOARD_LIST_LIMIT);
}

export async function createAnnouncement(body: string) {
  const { userId, client } = await requireUserId();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("El anuncio necesita contenido.");

  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (!profile?.isAdmin) throw new UnauthorizedError();

  const announcement = await new SupabaseAnnouncementRepository(client).create(
    userId,
    profile.username,
    trimmed,
  );

  await notifyAnnouncementSubscribers(userId, trimmed).catch((error: unknown) => {
    // El aviso es un extra, no debe tumbar la publicación si falla.
    console.error("No se pudo avisar a los usuarios del anuncio", error);
  });

  revalidatePath("/community");
  return announcement;
}

export async function updateAnnouncement(id: string, body: string) {
  const { userId, client } = await requireUserId();
  const trimmed = body.trim();
  if (!trimmed) throw new Error("El anuncio necesita contenido.");

  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (!profile?.isAdmin) throw new UnauthorizedError();

  const repo = new SupabaseAnnouncementRepository(client);
  const current = await repo.getById(id as AnnouncementId);
  if (!current) throw new Error("Anuncio no encontrado.");
  // La RLS ya lo bloquearía igualmente (announcements_update_admin_recent),
  // pero comprobarlo aquí da un mensaje claro en vez del error genérico de
  // Postgres por "ninguna fila actualizada".
  if (!canEditAnnouncement(current.createdAt)) {
    throw new Error("Ya no se puede editar: han pasado más de 24 horas desde que se publicó.");
  }

  const updated = await repo.update(id as AnnouncementId, trimmed);
  revalidatePath("/community");
  return updated;
}

export async function deleteAnnouncement(id: string) {
  const { userId, client } = await requireUserId();
  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (!profile?.isAdmin) throw new UnauthorizedError();

  await new SupabaseAnnouncementRepository(client).delete(id as AnnouncementId);
  revalidatePath("/community");
}

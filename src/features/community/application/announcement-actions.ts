"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseAnnouncementRepository } from "@/core/infrastructure/supabase/repositories/announcement-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { AnnouncementId, UserId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

export async function listAnnouncements() {
  const { client } = await requireUserId();
  return new SupabaseAnnouncementRepository(client).list();
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
  revalidatePath("/community");
  return announcement;
}

export async function deleteAnnouncement(id: string) {
  const { userId, client } = await requireUserId();
  const profile = await new SupabaseProfileRepository(client).getByOwnerId(userId);
  if (!profile?.isAdmin) throw new UnauthorizedError();

  await new SupabaseAnnouncementRepository(client).delete(id as AnnouncementId);
  revalidatePath("/community");
}

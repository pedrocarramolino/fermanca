"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import { GUEST_LOCALE_COOKIE } from "@/i18n/request";
import { isAccentPreset } from "@/features/settings/lib/accent-presets";
import { usernameSchema } from "@/features/auth/application/schemas";
import type { Locale, UserSettings } from "@/core/domain/user-settings";
import type { UserId } from "@/core/domain/ids";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/** `accentColor` no tiene columna con CHECK en BD (a diferencia de theme,
 * sound, visualStyle...) porque acepta tanto un preset como un hex libre —
 * y se interpola tal cual en un <style> del layout raíz (ver
 * accentOverrideCssFromHex), así que hay que validarlo aquí antes de
 * guardarlo. El <input type="color"> del navegador ya solo produce
 * "#rrggbb", pero esta acción es invocable directamente sin pasar por ese
 * control. */
function assertValidAccentColor(value: string | null | undefined): void {
  if (value == null) return;
  if (isAccentPreset(value) || HEX_COLOR_PATTERN.test(value)) return;
  throw new Error("Color de acento no válido.");
}

/**
 * Para las pantallas de login/registro, que no tienen sesión y por tanto no
 * pueden leer `user_settings.locale` — una cookie sencilla hace de sustituto
 * hasta que el visitante se registre (momento en el que ya tendrá su propia
 * fila de ajustes con el idioma que elija en Ajustes).
 */
export async function setGuestLocale(locale: Locale) {
  (await cookies()).set(GUEST_LOCALE_COOKIE, locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });
}

export async function updateSettings(
  changes: Partial<Omit<UserSettings, "ownerId">>,
): Promise<UserSettings> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  assertValidAccentColor(changes.accentColor);

  const repo = new SupabaseUserSettingsRepository(supabase);
  return repo.upsert(sub as UserId, changes);
}

export async function updateMyUsername(username: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const parsed = usernameSchema.safeParse(username);
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "Nombre de usuario no válido.");
  }

  const repo = new SupabaseProfileRepository(supabase);
  const existing = await repo.getByUsername(parsed.data);
  if (existing && existing.ownerId !== userId) {
    throw new Error("Ese nombre de usuario ya está en uso.");
  }

  const profile = await repo.updateUsername(userId as UserId, parsed.data);
  revalidatePath("/settings");
  revalidatePath("/community");
  return profile;
}

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
const AVATAR_EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function uploadAvatar(formData: FormData) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Archivo no válido.");
  const extension = AVATAR_EXTENSION_BY_MIME[file.type];
  if (!extension) throw new Error("La imagen debe ser PNG, JPEG o WebP.");
  if (file.size > AVATAR_MAX_BYTES) throw new Error("La imagen no puede pesar más de 5 MB.");

  // Nombre de fichero fijo por usuario (no aleatorio): una foto nueva
  // sustituye a la anterior en vez de acumular basura en el bucket.
  const path = `${userId}/avatar.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);
  // La URL pública en sí no cambia entre subidas (mismo path) — sin este
  // parámetro, el navegador/CDN seguiría enseñando la imagen vieja en caché.
  const avatarUrl = `${publicUrl}?v=${Date.now()}`;

  const profile = await new SupabaseProfileRepository(supabase).updateAvatarUrl(
    userId as UserId,
    avatarUrl,
  );
  revalidatePath("/settings");
  revalidatePath("/community");
  return profile;
}

export async function removeAvatar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const profile = await new SupabaseProfileRepository(supabase).updateAvatarUrl(
    userId as UserId,
    null,
  );
  revalidatePath("/settings");
  revalidatePath("/community");
  return profile;
}

/**
 * Borra la cuenta y, con ella, todo lo demás: sesiones, plantillas,
 * categorías propias, amistades, recordatorios y suscripciones push cuelgan
 * de auth.users con "on delete cascade" (ver las migraciones), así que
 * borrar el usuario con la clave de servicio se los lleva por delante sin
 * tener que borrar tabla por tabla. No hay vuelta atrás.
 */
export async function deleteMyAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const { error } = await createServiceClient().auth.admin.deleteUser(userId);
  if (error) throw error;

  await supabase.auth.signOut();
  redirect("/login");
}

"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import { GUEST_LOCALE_COOKIE } from "@/i18n/request";
import { isAccentPreset } from "@/features/settings/lib/accent-presets";
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

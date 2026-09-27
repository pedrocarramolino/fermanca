"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseUserSettingsRepository } from "@/core/infrastructure/supabase/repositories/user-settings-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import {
  calendarEventScheduleId,
  deleteQstashSchedule,
  reminderScheduleId,
} from "@/core/infrastructure/qstash/client";
import { GUEST_LOCALE_COOKIE } from "@/i18n/request";
import { isAccentPreset } from "@/features/settings/lib/accent-presets";
import { usernameSchema } from "@/features/auth/application/schemas";
import type { Locale, UserSettings } from "@/core/domain/user-settings";
import type { UserId } from "@/core/domain/ids";

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

/** `accentColor` no tiene columna con CHECK en BD (a diferencia de theme,
 * sound...) porque acepta tanto un preset como un hex libre —
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

/** Borra las fotos de perfil de la carpeta del usuario en el bucket, salvo
 * `keep`. Con el cliente del propio usuario: la política de Storage solo le
 * deja borrar en su carpeta, así que no puede tocar la de nadie más. */
async function removeAvatarFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep?: string,
) {
  const { data: files, error } = await supabase.storage.from("avatars").list(userId);
  if (error) throw error;
  const paths = files.map((file) => `${userId}/${file.name}`).filter((path) => path !== keep);
  if (paths.length === 0) return;
  const { error: removeError } = await supabase.storage.from("avatars").remove(paths);
  if (removeError) throw removeError;
}

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
  // El nombre del fichero depende del formato: si antes era avatar.png y
  // ahora es avatar.webp, la vieja se quedaba para siempre, pública y sin
  // que nada la usara. No es grave si falla: la nueva ya está puesta.
  await removeAvatarFiles(supabase, userId, path).catch((error: unknown) => {
    console.error("No se pudo borrar la foto de perfil anterior", error);
  });
  revalidatePath("/settings");
  revalidatePath("/community");
  return profile;
}

export async function removeAvatar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  // Antes solo se quitaba el enlace del perfil y la imagen seguía en el
  // bucket, pública. Primero el fichero: si falla, el usuario lo ve y puede
  // reintentar, en vez de creer que su foto ya no está en ningún sitio.
  await removeAvatarFiles(supabase, userId);
  const profile = await new SupabaseProfileRepository(supabase).updateAvatarUrl(
    userId as UserId,
    null,
  );
  revalidatePath("/settings");
  revalidatePath("/community");
  return profile;
}

/** Ids por consulta `.in()` — van en la URL, así que se trocean. */
const IDS_PER_QUERY = 100;

/**
 * Lo que queda de ti en sitios que no son tuyos y, por tanto, no cae en
 * cascada al borrar la cuenta (necesita la clave secreta, porque toca filas
 * de otros usuarios):
 *  · tu nombre en el historial de quienes hicieron una sesión contigo — el
 *    enlace entre las dos sesiones es mutuo (ver setLinkedSession), así que
 *    tus sesiones dicen cuáles son las suyas;
 *  · tu id en los informes de errores (app_errors), que se conservan para
 *    arreglar la app pero sin nada que los relacione contigo.
 * Lo que promete /delete-account depende de esto.
 */
async function forgetUserInOthersData(userId: string) {
  const service = createServiceClient();
  const { data: linked, error } = await service
    .from("sessions")
    .select("linked_session_id")
    .eq("owner_id", userId)
    .not("linked_session_id", "is", null);
  if (error) throw error;
  const partnerSessionIds = linked
    .map((row) => row.linked_session_id)
    .filter((id): id is string => id !== null);
  for (let i = 0; i < partnerSessionIds.length; i += IDS_PER_QUERY) {
    const { error: updateError } = await service
      .from("sessions")
      .update({ linked_session_peer_username: null })
      .in("id", partnerSessionIds.slice(i, i + IDS_PER_QUERY));
    if (updateError) throw updateError;
  }

  const { error: errorsError } = await service
    .from("app_errors")
    .update({ user_id: null })
    .eq("user_id", userId);
  if (errorsError) throw errorsError;
}

/**
 * Borra la cuenta y, con ella, todo lo demás: sesiones, plantillas,
 * categorías propias, amistades, recordatorios y suscripciones push cuelgan
 * de auth.users con "on delete cascade" (ver las migraciones), así que
 * borrar el usuario con la clave de servicio se los lleva por delante sin
 * tener que borrar tabla por tabla. No hay vuelta atrás.
 *
 * Dos cosas NO están en la base de datos y no caen en cascada, así que se
 * borran antes, mientras el usuario aún existe:
 *  · su foto de perfil en Storage — son datos personales, y Google Play
 *    exige borrarlos con la cuenta. Si falla, no se borra la cuenta: mejor
 *    un error que se puede reintentar que una foto que se queda para siempre;
 *  · las programaciones de QStash de sus recordatorios y avisos de
 *    calendario, que si no seguirían disparando cada semana (o cada año)
 *    para nadie. Si alguna falla, la ruta que la recibe la borra al ver que
 *    ya no existe (ver deleteOrphanSchedule), así que no bloquea el borrado.
 * Además se borra tu rastro en datos de otros (ver forgetUserInOthersData).
 * Todo esto va antes del borrado: si algo falla, la cuenta sigue intacta y
 * se puede reintentar, en vez de quedar a medias.
 *
 * Lo que se borra y lo que no está explicado en /delete-account: si cambia
 * algo aquí, revisa también esa página.
 */
export async function deleteMyAccount() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const [reminders, calendarEvents] = await Promise.all([
    supabase.from("reminders").select("id, qstash_schedule_id").eq("owner_id", userId),
    supabase.from("calendar_events").select("id, qstash_schedule_id").eq("owner_id", userId),
  ]);
  if (reminders.error) throw reminders.error;
  if (calendarEvents.error) throw calendarEvents.error;
  // Por el id fijo y por el guardado en la fila: las programaciones creadas
  // antes de que el id fuera fijo solo se conocen por este último.
  const scheduleIds = new Set(
    [
      ...reminders.data.flatMap((r) => [reminderScheduleId(r.id), r.qstash_schedule_id]),
      ...calendarEvents.data.flatMap((e) => [calendarEventScheduleId(e.id), e.qstash_schedule_id]),
    ].filter((id): id is string => id !== null),
  );

  await Promise.all([
    removeAvatarFiles(supabase, userId),
    forgetUserInOthersData(userId),
    ...[...scheduleIds].map(deleteQstashSchedule),
  ]);

  const { error } = await createServiceClient().auth.admin.deleteUser(userId);
  if (error) throw error;

  await supabase.auth.signOut();
  redirect("/login");
}

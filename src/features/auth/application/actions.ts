"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/core/infrastructure/supabase/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
} from "@/features/auth/application/schemas";

export interface AuthActionState {
  error: string | null;
  fieldErrors: Record<string, string> | null;
  success?: string;
}

const initialFieldErrors = null;

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    errors[key] ??= issue.message;
  }
  return errors;
}

async function originUrl() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "http";
  const host = h.get("host");
  return `${proto}://${host}`;
}

/**
 * `next` viene de un query param controlado por quien construye el enlace
 * de login, no del propio usuario — "/login?next=//evil.com" pasa
 * `startsWith("/")` (es una URL protocol-relative) y el navegador la
 * resuelve como "https://evil.com". Bloquear también "//" evita ese
 * open redirect tras un login legítimo.
 */
function safeRedirectPath(next: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

/** El campo de login acepta email o nombre de usuario — si no hay "@" se
 * resuelve a través del perfil con la clave de servicio (auth.users no es
 * consultable con la clave pública, ni falta que hace: el resto de la app
 * nunca necesita ver el email de otro usuario). */
async function resolveEmail(identifier: string): Promise<string | null> {
  if (identifier.includes("@")) return identifier;

  const serviceClient = createServiceClient();
  const profile = await new SupabaseProfileRepository(serviceClient).getByUsername(identifier);
  if (!profile) return null;

  const { data, error } = await serviceClient.auth.admin.getUserById(profile.ownerId);
  if (error || !data.user?.email) return null;
  return data.user.email;
}

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const email = await resolveEmail(parsed.data.identifier);
  if (!email) {
    return {
      error: translateAuthError("Invalid login credentials"),
      fieldErrors: initialFieldErrors,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: parsed.data.password,
  });
  if (error) {
    return { error: translateAuthError(error.message), fieldErrors: initialFieldErrors };
  }

  const next = String(formData.get("next") ?? "/");
  redirect(safeRedirectPath(next));
}

export async function signUp(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptedTerms: formData.get("acceptedTerms") === "on",
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  // Comprobación previa para un mensaje de error claro — la restricción
  // única (case-insensitive) en BD es la garantía real, pero si dejamos
  // que sea ella la que falle, el alta entera revienta dentro del trigger
  // y Supabase solo da un mensaje genérico de error de base de datos.
  const serviceClient = createServiceClient();
  const existing = await new SupabaseProfileRepository(serviceClient).getByUsername(
    parsed.data.username,
  );
  if (existing) {
    return {
      error: null,
      fieldErrors: { username: "Ese nombre de usuario ya está en uso." },
    };
  }

  const next = safeRedirectPath(String(formData.get("next") ?? "/"));

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // El next se lleva también aquí (no solo al redirect de abajo) porque
      // con la confirmación de email activada, el alta sigue por el enlace
      // del correo, no por esta misma request — p. ej. para que aceptar una
      // invitación de amistad desde el registro funcione, ese destino tiene
      // que sobrevivir hasta que el usuario confirme el correo.
      emailRedirectTo: `${await originUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      data: { username: parsed.data.username },
    },
  });
  if (error) {
    return { error: translateAuthError(error.message), fieldErrors: initialFieldErrors };
  }

  // Con la confirmación de email activada (por defecto en Supabase), signUp
  // no abre sesión: hay que avisar al usuario para que revise su correo.
  if (data.user && !data.session) {
    return {
      error: null,
      fieldErrors: initialFieldErrors,
      success: "Te hemos enviado un correo para confirmar tu cuenta.",
    };
  }

  redirect(next);
}

export async function requestPasswordReset(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await originUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    return { error: translateAuthError(error.message), fieldErrors: initialFieldErrors };
  }

  return {
    error: null,
    fieldErrors: initialFieldErrors,
    success:
      "Si ese correo tiene una cuenta, te hemos enviado un enlace para restablecer la contraseña.",
  };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    return { error: translateAuthError(error.message), fieldErrors: initialFieldErrors };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function translateAuthError(message: string): string {
  const known: Record<string, string> = {
    "Invalid login credentials": "Correo o contraseña incorrectos.",
    "User already registered": "Ya existe una cuenta con ese correo.",
    "Email not confirmed": "Confirma tu correo antes de iniciar sesión.",
    "email rate limit exceeded":
      "Se han enviado demasiados correos. Inténtalo de nuevo en unos minutos.",
    // El trigger que crea el perfil aborta el alta entera si el nombre de
    // usuario ya se coló (carrera con otro registro simultáneo) — la
    // comprobación previa en signUp() evita esto casi siempre, este es solo
    // el mensaje para el caso residual.
    "Database error saving new user":
      "Ese nombre de usuario se ha registrado justo antes que el tuyo. Prueba con otro.",
  };
  if (known[message]) return known[message];

  // Supabase mete el correo dentro del mensaje ("Email address "x@y" is
  // invalid"), así que no hay forma de que coincida con el diccionario
  // exacto de arriba — lo detecta por patrón. No es solo un formato
  // raro: Supabase también rechaza así dominios de prueba conocidos
  // (p. ej. example.com), algo que la validación de zod no puede saber.
  if (/email address .* is invalid/i.test(message)) {
    return "Ese correo no es válido para crear una cuenta. Prueba con otro (algunos dominios de prueba, como example.com, no están permitidos).";
  }

  return message;
}

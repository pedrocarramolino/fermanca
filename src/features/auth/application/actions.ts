"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/core/infrastructure/supabase/server";
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

export async function signIn(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
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
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) {
    return { error: null, fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${await originUrl()}/auth/callback` },
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

  redirect("/");
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
  };
  return known[message] ?? message;
}

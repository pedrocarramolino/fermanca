import { z } from "zod";

const email = z.string().trim().min(1, "Introduce tu correo.").email("Correo no válido.");
const password = z.string().min(8, "Mínimo 8 caracteres.");
const username = z
  .string()
  .trim()
  .min(3, "Mínimo 3 caracteres.")
  .max(20, "Máximo 20 caracteres.")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guion bajo.");

/** Acepta email o nombre de usuario en el mismo campo — signIn resuelve
 * cuál es antes de llamar a Supabase. */
export const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Introduce tu correo o nombre de usuario."),
  password: z.string().min(1, "Introduce tu contraseña."),
});

export const signUpSchema = z
  .object({
    email,
    username,
    password,
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
    acceptedTerms: z.literal(true, {
      message: "Debes aceptar los términos y la política de privacidad.",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z
  .object({
    password,
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

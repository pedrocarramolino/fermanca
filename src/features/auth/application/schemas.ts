import { z } from "zod";

const email = z.string().trim().min(1, "Introduce tu correo.").email("Correo no válido.");
const password = z.string().min(8, "Mínimo 8 caracteres.");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Introduce tu contraseña."),
});

export const signUpSchema = z
  .object({
    email,
    password,
    confirmPassword: z.string().min(1, "Confirma tu contraseña."),
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

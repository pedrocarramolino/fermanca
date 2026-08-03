import type { Metadata } from "next";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Restablecer contraseña" };

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-lg font-medium">Elige una nueva contraseña</h1>
      <ResetPasswordForm />
    </div>
  );
}

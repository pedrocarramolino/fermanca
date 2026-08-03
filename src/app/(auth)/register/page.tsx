import type { Metadata } from "next";
import { RegisterForm } from "@/features/auth/components/register-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-lg font-medium">Crea tu cuenta</h1>
      <RegisterForm />
    </div>
  );
}

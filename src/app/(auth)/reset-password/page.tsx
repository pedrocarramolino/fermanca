import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.resetPassword");
  return { title: t("title") };
}

export default async function ResetPasswordPage() {
  const t = await getTranslations("Auth.resetPassword");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-lg font-medium">{t("title")}</h1>
      <ResetPasswordForm />
    </div>
  );
}

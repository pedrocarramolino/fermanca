import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/features/auth/components/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.register");
  return { title: t("title") };
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const t = await getTranslations("Auth.register");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-lg font-medium">{t("title")}</h1>
      <RegisterForm next={next} />
    </div>
  );
}

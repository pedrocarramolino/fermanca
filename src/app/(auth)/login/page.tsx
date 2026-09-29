import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LoginForm } from "@/features/auth/components/login-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.login");
  // Su propia URL canónica: sin esto hereda la "/" del layout raíz y
  // Google la trataría como un duplicado de la portada.
  return { title: t("title"), alternates: { canonical: "/login" } };
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const t = await getTranslations("Auth.login");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-lg font-medium">{t("title")}</h1>
      <LoginForm next={next} />
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Terms");
  return { title: t("title") };
}

export default async function TermsPage() {
  const t = await getTranslations("Terms");

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">{t("title")}</h1>
      </div>

      <p className="text-muted-foreground text-sm">{t("lastUpdated")}</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("about.heading")}</h2>
          <p>{t("about.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("usage.heading")}</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>{t("usage.item1")}</li>
            <li>{t("usage.item2")}</li>
            <li>{t("usage.item3")}</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("availability.heading")}</h2>
          <p>{t("availability.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("content.heading")}</h2>
          <p>{t("content.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("liability.heading")}</h2>
          <p>{t("liability.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("law.heading")}</h2>
          <p>{t("law.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("contact.heading")}</h2>
          <p>
            {t.rich("contact.body", {
              email: (chunks) => (
                <a
                  href="mailto:pedrocarramolino34@gmail.com"
                  className="text-foreground underline underline-offset-4"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>
      </div>

      <p className="text-muted-foreground text-sm">
        {t.rich("seeAlso", {
          link: (chunks) => (
            <Link href="/privacy" className="text-foreground underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </main>
  );
}

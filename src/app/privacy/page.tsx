import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Privacy");
  return { title: t("title") };
}

export default async function PrivacyPage() {
  const t = await getTranslations("Privacy");

  const emailLink = (chunks: React.ReactNode) => (
    <a
      href="mailto:pedrocarramolino34@gmail.com"
      className="text-foreground underline underline-offset-4"
    >
      {chunks}
    </a>
  );

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
          <h2 className="text-base font-semibold">{t("controller.heading")}</h2>
          <p>{t.rich("controller.body", { email: emailLink })}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("dataCollected.heading")}</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>{t("dataCollected.item1")}</li>
            <li>{t("dataCollected.item2")}</li>
            <li>{t("dataCollected.item3")}</li>
            <li>{t("dataCollected.item4")}</li>
            <li>{t("dataCollected.item5")}</li>
            <li>{t("dataCollected.item6")}</li>
          </ul>
          <p>{t("dataCollected.outro")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("dataUse.heading")}</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>{t("dataUse.item1")}</li>
            <li>{t("dataUse.item2")}</li>
            <li>{t("dataUse.item3")}</li>
            <li>{t("dataUse.item4")}</li>
            <li>{t("dataUse.item5")}</li>
          </ul>
          <p>{t("dataUse.outro")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("dataSharing.heading")}</h2>
          <p>{t("dataSharing.intro")}</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              <strong className="font-medium">{t("dataSharing.item1Strong")}</strong>
              {t("dataSharing.item1Rest")}
            </li>
            <li>
              <strong className="font-medium">{t("dataSharing.item2Strong")}</strong>
              {t("dataSharing.item2Rest")}
            </li>
            <li>
              <strong className="font-medium">{t("dataSharing.item3Strong")}</strong>
              {t("dataSharing.item3Rest")}
            </li>
            <li>{t("dataSharing.item4")}</li>
          </ul>
          <p>{t("dataSharing.outro")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("retention.heading")}</h2>
          <p>{t.rich("retention.body", { email: emailLink })}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("rights.heading")}</h2>
          <p>
            {t.rich("rights.body", {
              email: emailLink,
              aepd: (chunks) => (
                <a
                  href="https://www.aepd.es"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline underline-offset-4"
                >
                  {chunks}
                </a>
              ),
            })}
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("minors.heading")}</h2>
          <p>{t("minors.body")}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("changes.heading")}</h2>
          <p>{t("changes.body")}</p>
        </section>
      </div>

      <p className="text-muted-foreground text-sm">
        {t.rich("seeAlso", {
          link: (chunks) => (
            <Link href="/terms" className="text-foreground underline underline-offset-4">
              {chunks}
            </Link>
          ),
        })}
      </p>
    </main>
  );
}

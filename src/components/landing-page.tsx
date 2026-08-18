import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BarChart3, Flame, Timer, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

const FEATURES = [
  { icon: Timer, key: "sessions" },
  { icon: Flame, key: "streaks" },
  { icon: Users, key: "cooperative" },
  { icon: BarChart3, key: "stats" },
] as const;

/** Lo que ve quien entra en "/" sin haber iniciado sesión — antes no existía
 * ninguna versión pública de la home: se le mostraba el mismo panel de la
 * app, vacío y sin sentido para alguien que todavía no tiene cuenta. Esta es
 * también la única página que un buscador puede rastrear con contenido real
 * (ver robots.ts/sitemap.ts), así que lleva el texto/keywords y el JSON-LD. */
export async function LandingPage() {
  const [t, tCommon, tTerms, tPrivacy] = await Promise.all([
    getTranslations("Landing"),
    getTranslations("Common"),
    getTranslations("Terms"),
    getTranslations("Privacy"),
  ]);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: siteConfig.name,
    description: siteConfig.description,
    url: siteConfig.url,
    applicationCategory: "MusicApplication",
    operatingSystem: "Any (PWA)",
    offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
  };

  return (
    <main className="mx-auto flex min-h-svh max-w-4xl flex-col gap-16 p-8 pb-16 lg:max-w-5xl">
      <script
        type="application/ld+json"
        // El JSON-LD es siempre el mismo objeto estático — no depende de
        // nada que difiera entre servidor y cliente, así que no puede
        // provocar el desajuste de hidratación que tuvo LaunchAnimation.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="flex items-center justify-between">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-96x96.png" alt="" className="size-7 rounded-lg" />
          {siteConfig.name}
        </span>
        <Button variant="ghost" render={<Link href="/login" />} nativeButton={false}>
          {t("signIn")}
        </Button>
      </header>

      <section className="flex flex-col items-center gap-6 py-8 text-center sm:py-16">
        <h1 className="max-w-2xl text-4xl font-bold text-balance sm:text-5xl">
          {t("heroTitle")}
        </h1>
        <p className="text-muted-foreground max-w-xl text-lg text-balance">{t("heroSubtitle")}</p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button size="lg" render={<Link href="/register" />} nativeButton={false}>
            {t("ctaPrimary")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/login" />}
            nativeButton={false}
          >
            {t("ctaSecondary")}
          </Button>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, key }) => (
          <Card key={key}>
            <CardContent className="flex flex-col gap-3">
              <Icon className="text-primary size-6" aria-hidden />
              <h2 className="font-semibold">{t(`features.${key}.title`)}</h2>
              <p className="text-muted-foreground text-sm">
                {t(`features.${key}.description`)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="border-border flex flex-col items-center gap-4 rounded-xl border py-12 text-center">
        <h2 className="text-2xl font-semibold">{t("finalCtaTitle")}</h2>
        <Button size="lg" render={<Link href="/register" />} nativeButton={false}>
          {t("ctaPrimary")}
        </Button>
      </section>

      <footer className="text-muted-foreground flex flex-col items-center gap-2 text-center text-xs">
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:text-foreground underline underline-offset-4">
            {tPrivacy("title")}
          </Link>
          <Link href="/terms" className="hover:text-foreground underline underline-offset-4">
            {tTerms("title")}
          </Link>
        </div>
        <p>{tCommon("footerCredit", { year: new Date().getFullYear() })}</p>
      </footer>
    </main>
  );
}

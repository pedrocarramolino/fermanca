import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("AccountDeletion");
  return { title: t("title") };
}

/**
 * Página pública (sin sesión) para pedir la eliminación de la cuenta.
 *
 * Google Play exige, a las apps que permiten crear cuenta, un enlace web
 * donde cualquiera pueda ver cómo eliminarla sin tener que instalar la app
 * — se indica en la ficha de Play Console, en "Seguridad de los datos". Por
 * eso vive fuera del proxy de sesión (ver PUBLIC_ROUTES en proxy.ts) y
 * explica también la vía por correo, para quien ya no puede entrar.
 *
 * Lo que dice "Qué se elimina" / "Qué se conserva" tiene que seguir siendo
 * verdad: si cambia lo que borra deleteMyAccount (settings/application/
 * actions.ts) o se añaden datos nuevos, hay que revisar esta página.
 */
export default async function DeleteAccountPage() {
  const t = await getTranslations("AccountDeletion");

  const emailLink = (chunks: React.ReactNode) => (
    <a
      href="mailto:pedrocarramolino34@gmail.com?subject=Eliminar%20mi%20cuenta%20de%20Ferman%C3%A7a"
      className="text-foreground underline underline-offset-4"
    >
      {chunks}
    </a>
  );

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">{t("title")}</h1>
      </div>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <p>{t("intro")}</p>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("inApp.heading")}</h2>
          <p>{t("inApp.intro")}</p>
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            <li>{t("inApp.step1")}</li>
            <li>{t("inApp.step2")}</li>
            <li>{t("inApp.step3")}</li>
            <li>{t("inApp.step4")}</li>
          </ol>
          <Button
            variant="outline"
            className="mt-2 self-start"
            render={<Link href="/settings" />}
            nativeButton={false}
          >
            {t("inApp.cta")}
          </Button>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("byEmail.heading")}</h2>
          <p>{t.rich("byEmail.body", { email: emailLink })}</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("deleted.heading")}</h2>
          <p>{t("deleted.intro")}</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>{t("deleted.item1")}</li>
            <li>{t("deleted.item2")}</li>
            <li>{t("deleted.item3")}</li>
            <li>{t("deleted.item4")}</li>
            <li>{t("deleted.item5")}</li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">{t("kept.heading")}</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>{t("kept.item1")}</li>
            <li>{t("kept.item2")}</li>
          </ul>
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

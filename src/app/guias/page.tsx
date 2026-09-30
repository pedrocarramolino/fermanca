import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { GUIDES, GUIDES_OG_IMAGE } from "@/features/guides/guides";
import { GuidesFooter, GuidesHeader } from "@/features/guides/components/guides-chrome";

const TITLE = "Guías para practicar mejor";
const DESCRIPTION =
  "Rutinas de práctica, consejos para ser constante y guías por instrumento para sacar más partido a cada sesión de estudio.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/guias" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/guias", images: [GUIDES_OG_IMAGE] },
};

export default function GuidesIndexPage() {
  return (
    <main lang="es" className="mx-auto flex min-h-svh max-w-3xl flex-col gap-10 p-8 pb-32">
      <GuidesHeader />

      <section className="flex flex-col gap-3">
        <h1 className="text-3xl font-bold text-balance sm:text-4xl">{TITLE}</h1>
        <p className="text-muted-foreground text-lg text-balance">{DESCRIPTION}</p>
      </section>

      <ul className="flex flex-col gap-4">
        {GUIDES.map((guide) => (
          <li key={guide.slug}>
            <Link href={`/guias/${guide.slug}`} className="group block">
              <Card className="group-hover:border-primary transition-colors">
                <CardContent className="flex flex-col gap-2">
                  <h2 className="text-lg font-semibold">{guide.title}</h2>
                  <p className="text-muted-foreground text-sm">{guide.description}</p>
                  <span className="text-primary flex items-center gap-1 text-sm font-medium">
                    Leer guía · {guide.readingMinutes} min
                    <ArrowRight className="size-4" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            </Link>
          </li>
        ))}
      </ul>

      <GuidesFooter />
    </main>
  );
}

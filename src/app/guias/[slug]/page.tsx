import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import { formatCalendarDate } from "@/lib/format-date";
import { GUIDES, GUIDES_OG_IMAGE, getGuide } from "@/features/guides/guides";
import { GuideBody } from "@/features/guides/components/guide-body";
import {
  GuideCallToAction,
  GuidesFooter,
  GuidesHeader,
} from "@/features/guides/components/guides-chrome";

// Solo existen las guías de guides.ts: cualquier otra ruta es un 404.
export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((guide) => ({ slug: guide.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const guide = getGuide((await params).slug);
  if (!guide) return {};
  const path = `/guias/${guide.slug}`;
  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      type: "article",
      title: guide.title,
      description: guide.description,
      url: path,
      images: [GUIDES_OG_IMAGE],
      publishedTime: guide.publishedAt,
      modifiedTime: guide.updatedAt,
    },
  };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = getGuide((await params).slug);
  if (!guide) notFound();

  const url = `${siteConfig.url}/guias/${guide.slug}`;
  const otherGuides = GUIDES.filter((other) => other.slug !== guide.slug);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        headline: guide.title,
        description: guide.description,
        inLanguage: "es",
        datePublished: guide.publishedAt,
        dateModified: guide.updatedAt,
        mainEntityOfPage: url,
        author: { "@type": "Organization", name: siteConfig.name, url: siteConfig.url },
        publisher: {
          "@type": "Organization",
          name: siteConfig.name,
          url: siteConfig.url,
          logo: `${siteConfig.url}/icons/icon-512x512.png`,
        },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: siteConfig.name, item: siteConfig.url },
          { "@type": "ListItem", position: 2, name: "Guías", item: `${siteConfig.url}/guias` },
          { "@type": "ListItem", position: 3, name: guide.title, item: url },
        ],
      },
    ],
  };

  return (
    <main lang="es" className="mx-auto flex min-h-svh max-w-3xl flex-col gap-10 p-8 pb-32">
      <script
        type="application/ld+json"
        // Contenido fijo de guides.ts: igual en servidor y cliente.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <GuidesHeader />

      <article className="flex flex-col gap-6">
        <nav aria-label="Ruta" className="text-muted-foreground flex items-center gap-1 text-sm">
          <Link href="/guias" className="hover:text-foreground underline-offset-4 hover:underline">
            Guías
          </Link>
          <ChevronRight className="size-3.5" aria-hidden />
        </nav>

        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-bold text-balance sm:text-4xl">{guide.title}</h1>
          <p className="text-muted-foreground text-sm">
            {/* Fecha de calendario en UTC: la misma en el servidor y en el móvil. */}
            Actualizada el {formatCalendarDate(guide.updatedAt, "es")} · {guide.readingMinutes} min
            de lectura
          </p>
        </header>

        <GuideBody blocks={guide.body} />
      </article>

      <GuideCallToAction />

      {otherGuides.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Más guías</h2>
          <ul className="flex flex-col gap-2">
            {otherGuides.map((other) => (
              <li key={other.slug}>
                <Link
                  href={`/guias/${other.slug}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {other.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <GuidesFooter />
    </main>
  );
}

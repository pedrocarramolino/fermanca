import Link from "next/link";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/config/site";

/** Cabecera y pie de /guias — mismo aspecto que la portada (landing-page.tsx).
 * En español fijo, como el contenido de las guías (ver guides.ts). */
export function GuidesHeader() {
  return (
    <header className="flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-96x96.png" alt="" className="size-7 rounded-lg" />
        {siteConfig.name}
      </Link>
      <Button size="sm" render={<Link href="/register" />} nativeButton={false}>
        Empezar gratis
      </Button>
    </header>
  );
}

export function GuidesFooter() {
  return (
    <footer className="text-muted-foreground flex flex-wrap justify-center gap-4 text-xs">
      <Link href="/" className="hover:text-foreground underline underline-offset-4">
        Inicio
      </Link>
      <Link href="/guias" className="hover:text-foreground underline underline-offset-4">
        Guías
      </Link>
      <Link href="/privacy" className="hover:text-foreground underline underline-offset-4">
        Privacidad
      </Link>
      <Link href="/terms" className="hover:text-foreground underline underline-offset-4">
        Términos
      </Link>
    </footer>
  );
}

/** El cierre de cada guía: de leer a probarlo. */
export function GuideCallToAction() {
  return (
    <section className="border-border bg-muted/40 flex flex-col items-center gap-3 rounded-xl border px-6 py-8 text-center">
      <h2 className="text-xl font-semibold">Organiza tu práctica con Fermança</h2>
      <p className="text-muted-foreground max-w-md text-sm">
        Sesiones por bloques que se encadenan solas, rachas, objetivo semanal y práctica con amigos.
        Es gratis.
      </p>
      <Button size="lg" render={<Link href="/register" />} nativeButton={false}>
        Empezar gratis
      </Button>
    </section>
  );
}

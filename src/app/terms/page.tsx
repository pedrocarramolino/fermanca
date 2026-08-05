import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Términos de servicio" };

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">Términos de servicio</h1>
      </div>

      <p className="text-muted-foreground text-sm">Última actualización: 5 de agosto de 2026</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Sobre PracticeFlow</h2>
          <p>
            PracticeFlow es un proyecto personal desarrollado por Pedro Carramolino González para
            ayudarte a organizar tus sesiones de práctica musical. No es un servicio prestado por
            una empresa registrada.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Uso del servicio</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              Necesitas una cuenta para usar PracticeFlow. Eres responsable de mantener la
              confidencialidad de tu contraseña y de la actividad que ocurra en tu cuenta.
            </li>
            <li>
              Debes proporcionar datos reales al registrarte (correo válido) y no usar la
              aplicación para fines ilegales, ni para acosar o dañar a otras personas a través de
              la función de Comunidad.
            </li>
            <li>
              Nos reservamos el derecho de suspender o eliminar cuentas que incumplan estos
              términos.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Disponibilidad del servicio</h2>
          <p>
            PracticeFlow se ofrece &ldquo;tal cual&rdquo;, sin garantías de disponibilidad
            continua. Al ser un proyecto personal, el servicio puede sufrir interrupciones,
            cambios o, en último caso, discontinuarse, y procuraremos avisar con antelación
            razonable si eso ocurriera con tus datos en juego.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Contenido que subes</h2>
          <p>
            El contenido que escribes (notas de sesión, nombres de categorías, etc.) es tuyo. Al
            usar la Comunidad, aceptas que tu nombre de usuario y tu progreso agregado (no el
            detalle de tus sesiones) sean visibles para las personas que aceptes como amigos.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Limitación de responsabilidad</h2>
          <p>
            En la medida permitida por la ley, PracticeFlow se ofrece sin garantías de ningún
            tipo, y no nos hacemos responsables de pérdidas de datos o daños derivados del uso del
            servicio, más allá de lo que exija la normativa aplicable.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Ley aplicable</h2>
          <p>Estos términos se rigen por la legislación española.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Contacto</h2>
          <p>
            Para cualquier duda sobre estos términos, escribe a{" "}
            <a
              href="mailto:pedrocarramolino34@gmail.com"
              className="text-foreground underline underline-offset-4"
            >
              pedrocarramolino34@gmail.com
            </a>
            .
          </p>
        </section>
      </div>

      <p className="text-muted-foreground text-sm">
        Consulta también la{" "}
        <Link href="/privacy" className="text-foreground underline underline-offset-4">
          Política de privacidad
        </Link>
        .
      </p>
    </main>
  );
}

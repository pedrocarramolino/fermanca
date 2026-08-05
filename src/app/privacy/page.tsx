import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Política de privacidad" };

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon-sm" render={<Link href="/" />} nativeButton={false}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="text-lg font-medium">Política de privacidad</h1>
      </div>

      <p className="text-muted-foreground text-sm">Última actualización: 5 de agosto de 2026</p>

      <div className="flex flex-col gap-6 text-sm leading-relaxed">
        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Responsable del tratamiento</h2>
          <p>
            Pedro Carramolino González, como persona física, es responsable del tratamiento de
            los datos que recoge PracticeFlow. Puedes contactar para cualquier duda sobre tus
            datos en{" "}
            <a
              href="mailto:pedrocarramolino34@gmail.com"
              className="text-foreground underline underline-offset-4"
            >
              pedrocarramolino34@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Qué datos recogemos</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              Datos de la cuenta: correo electrónico, nombre de usuario y contraseña (esta última
              nunca se guarda en texto plano; la gestiona nuestro proveedor de autenticación).
            </li>
            <li>
              Datos de práctica: las sesiones que registras (bloques, categorías, duración, notas
              que escribas), las plantillas y categorías personalizadas que crees.
            </li>
            <li>
              Datos de comunidad: tu código de invitación, tus amistades aceptadas o pendientes, y
              los minutos y racha semanales agregados que tus amigos pueden ver.
            </li>
            <li>Recordatorios: la hora y los días que configures, y tu zona horaria.</li>
            <li>
              Notificaciones push: si las activas, tu navegador nos da un identificador de
              suscripción y claves de cifrado necesarias para enviarte avisos — no los usamos para
              nada más.
            </li>
            <li>
              Datos técnicos básicos que genera cualquier servicio web (dirección IP, tipo de
              navegador) a través de nuestro proveedor de hosting, con fines de seguridad y
              funcionamiento del servicio.
            </li>
          </ul>
          <p>
            No recogemos datos de pago (PracticeFlow no tiene compras ni suscripciones) ni usamos
            cookies de publicidad o seguimiento.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Para qué usamos tus datos</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>Para que puedas iniciar sesión y usar la aplicación.</li>
            <li>Para guardar y mostrarte tu historial y estadísticas de práctica.</li>
            <li>
              Para la función de Comunidad: mostrar tu progreso agregado (no el detalle de tus
              sesiones) a las personas que aceptes como amigos, y viceversa.
            </li>
            <li>Para enviarte las notificaciones push y recordatorios que actives tú mismo.</li>
            <li>Para mantener el servicio funcionando de forma segura.</li>
          </ul>
          <p>No vendemos ni cedemos tus datos a terceros con fines comerciales o publicitarios.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Con quién compartimos tus datos</h2>
          <p>
            Usamos los siguientes proveedores para hacer funcionar PracticeFlow, que procesan
            datos en nuestro nombre:
          </p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5">
            <li>
              <strong className="font-medium">Supabase</strong> — base de datos y autenticación.
            </li>
            <li>
              <strong className="font-medium">Vercel</strong> — alojamiento de la aplicación.
            </li>
            <li>
              <strong className="font-medium">Upstash (QStash)</strong> — envío programado de
              notificaciones push en el momento exacto configurado.
            </li>
            <li>
              El navegador que uses (Chrome, Firefox, Safari…) gestiona la entrega técnica de las
              notificaciones push a través de su propio servicio de push, como parte estándar de
              esa tecnología web.
            </li>
          </ul>
          <p>Ninguno de estos proveedores puede usar tus datos para sus propios fines.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Cuánto tiempo conservamos tus datos</h2>
          <p>
            Mientras mantengas tu cuenta activa. Si quieres eliminar tu cuenta y todos tus datos,
            escríbenos a{" "}
            <a
              href="mailto:pedrocarramolino34@gmail.com"
              className="text-foreground underline underline-offset-4"
            >
              pedrocarramolino34@gmail.com
            </a>{" "}
            y lo haremos en un plazo razonable — de momento no hay una opción de autoservicio
            dentro de la app.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Tus derechos</h2>
          <p>
            Si resides en la Unión Europea, tienes derecho a acceder a tus datos, corregirlos,
            pedir su eliminación, limitar u oponerte a su tratamiento, y a la portabilidad de tus
            datos. Puedes ejercerlos escribiendo a{" "}
            <a
              href="mailto:pedrocarramolino34@gmail.com"
              className="text-foreground underline underline-offset-4"
            >
              pedrocarramolino34@gmail.com
            </a>
            . También puedes reclamar ante la{" "}
            <a
              href="https://www.aepd.es"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              Agencia Española de Protección de Datos
            </a>
            .
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Menores de edad</h2>
          <p>
            PracticeFlow no está dirigido a menores de 14 años. Si eres menor de esa edad,
            necesitas el consentimiento de tu tutor legal para usar la aplicación.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Cambios en esta política</h2>
          <p>
            Si cambiamos esta política de forma relevante, lo indicaremos en esta misma página
            junto con la fecha de la última actualización.
          </p>
        </section>
      </div>

      <p className="text-muted-foreground text-sm">
        Consulta también los{" "}
        <Link href="/terms" className="text-foreground underline underline-offset-4">
          Términos de servicio
        </Link>
        .
      </p>
    </main>
  );
}

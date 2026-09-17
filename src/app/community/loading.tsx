import { AppHeader } from "@/components/app-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Calca la forma de la pantalla real (código de invitación, añadir amigo,
 * los dos accesos a Amigos y Grupos, y la tarjeta de WhatsApp) para que al
 * llegar los datos no dé un salto de maquetación. Los apartados que pueden
 * venir vacíos —solicitudes, sugerencias, invitaciones— no reservan hueco a
 * propósito: lo normal es que no haya ninguno. */
export default function Loading() {
  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <AppHeader />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-36 rounded-xl" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-16 rounded-lg" />
      <Skeleton className="h-40 rounded-xl" />
    </main>
  );
}

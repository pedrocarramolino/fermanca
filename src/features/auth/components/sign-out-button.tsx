import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/features/auth/application/actions";

/** Separado con su propio `Separator` (mismo patrón que DeleteAccountCard) y
 * en rojo suave (`variant="destructive"`, no un botón sólido de alarma):
 * cierra la sesión actual, no es tan grave como borrar la cuenta, pero
 * tampoco es una acción neutra más para dejarla mezclada con el resto. */
export async function SignOutButton() {
  const t = await getTranslations("Common");

  return (
    <>
      <Separator className="my-2" />
      <form action={signOut}>
        <Button type="submit" variant="destructive">
          <LogOut className="size-4" />
          {t("signOut")}
        </Button>
      </form>
    </>
  );
}

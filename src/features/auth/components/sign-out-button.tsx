import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/application/actions";

export async function SignOutButton() {
  const t = await getTranslations("Common");

  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="icon" aria-label={t("signOut")}>
        <LogOut className="size-4" />
      </Button>
    </form>
  );
}

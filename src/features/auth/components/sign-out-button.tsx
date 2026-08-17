import { LogOut } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/application/actions";

export async function SignOutButton() {
  const t = await getTranslations("Common");

  return (
    <form action={signOut}>
      <Button type="submit" variant="outline" size="sm">
        <LogOut className="size-4" />
        {t("signOut")}
      </Button>
    </form>
  );
}

import { Button } from "@/components/ui/button";
import { signOut } from "@/features/auth/application/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <Button type="submit" variant="ghost" size="sm">
        Cerrar sesión
      </Button>
    </form>
  );
}

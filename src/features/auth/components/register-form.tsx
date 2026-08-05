"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthActionState } from "@/features/auth/application/actions";

const initialState: AuthActionState = { error: null, fieldErrors: null };

export function RegisterForm() {
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  if (state.success) {
    return <p className="text-center text-sm">{state.success}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Correo</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={!!state.fieldErrors?.email}
        />
        {state.fieldErrors?.email && (
          <p className="text-destructive text-sm">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="username">Nombre de usuario</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          aria-invalid={!!state.fieldErrors?.username}
        />
        <p className="text-muted-foreground text-xs">
          Con esto te encuentran tus amigos en Comunidad, y también sirve para iniciar sesión.
        </p>
        {state.fieldErrors?.username && (
          <p className="text-destructive text-sm">{state.fieldErrors.username}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Contraseña</Label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          required
          aria-invalid={!!state.fieldErrors?.password}
        />
        {state.fieldErrors?.password && (
          <p className="text-destructive text-sm">{state.fieldErrors.password}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          autoComplete="new-password"
          required
          aria-invalid={!!state.fieldErrors?.confirmPassword}
        />
        {state.fieldErrors?.confirmPassword && (
          <p className="text-destructive text-sm">{state.fieldErrors.confirmPassword}</p>
        )}
      </div>

      {state.error && <p className="text-destructive text-sm">{state.error}</p>}

      <div className="flex flex-col gap-2">
        <div className="flex items-start gap-2">
          <Checkbox
            id="acceptedTerms"
            name="acceptedTerms"
            required
            checked={acceptedTerms}
            onCheckedChange={setAcceptedTerms}
            aria-invalid={!!state.fieldErrors?.acceptedTerms}
            className="mt-0.5"
          />
          <label
            htmlFor="acceptedTerms"
            className="text-muted-foreground text-xs leading-normal select-none"
          >
            Acepto los{" "}
            <Link href="/terms" className="text-foreground underline underline-offset-4">
              Términos de servicio
            </Link>{" "}
            y la{" "}
            <Link href="/privacy" className="text-foreground underline underline-offset-4">
              Política de privacidad
            </Link>
            .
          </label>
        </div>
        {state.fieldErrors?.acceptedTerms && (
          <p className="text-destructive text-sm">{state.fieldErrors.acceptedTerms}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending || !acceptedTerms} className="w-full">
        {isPending ? "Creando cuenta…" : "Crear cuenta"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { signUp, type AuthActionState } from "@/features/auth/application/actions";

const initialState: AuthActionState = { error: null, fieldErrors: null };

export function RegisterForm({ next }: { next?: string }) {
  const t = useTranslations("Auth.register");
  const [state, formAction, isPending] = useActionState(signUp, initialState);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  if (state.success) {
    return <p className="text-center text-sm">{state.success}</p>;
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? "/"} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">{t("email")}</Label>
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
        <Label htmlFor="username">{t("username")}</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          aria-invalid={!!state.fieldErrors?.username}
        />
        <p className="text-muted-foreground text-xs">{t("usernameHint")}</p>
        {state.fieldErrors?.username && (
          <p className="text-destructive text-sm">{state.fieldErrors.username}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">{t("password")}</Label>
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
        <Label htmlFor="confirmPassword">{t("confirmPassword")}</Label>
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
            {t.rich("acceptTerms", {
              terms: (chunks) => (
                <Link href="/terms" className="text-foreground underline underline-offset-4">
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link href="/privacy" className="text-foreground underline underline-offset-4">
                  {chunks}
                </Link>
              ),
            })}
          </label>
        </div>
        {state.fieldErrors?.acceptedTerms && (
          <p className="text-destructive text-sm">{state.fieldErrors.acceptedTerms}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending || !acceptedTerms} className="w-full">
        {isPending ? t("submitting") : t("submit")}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        {t("hasAccount")}{" "}
        <Link
          href={next ? `/login?next=${encodeURIComponent(next)}` : "/login"}
          className="text-foreground underline underline-offset-4"
        >
          {t("signIn")}
        </Link>
      </p>
    </form>
  );
}

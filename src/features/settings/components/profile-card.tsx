"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Camera, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  removeAvatar,
  updateMyUsername,
  uploadAvatar,
} from "@/features/settings/application/actions";

export function ProfileCard({
  username: initialUsername,
  avatarUrl: initialAvatarUrl,
  email,
  memberSince,
}: {
  username: string;
  avatarUrl: string | null;
  email: string;
  memberSince: string;
}) {
  const t = useTranslations("Profile");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isUpdatingAvatar, startUpdatingAvatar] = useTransition();

  const [username, setUsername] = useState(initialUsername);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [isSavingUsername, startSavingUsername] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setAvatarError(null);
    const formData = new FormData();
    formData.set("file", file);
    startUpdatingAvatar(async () => {
      try {
        const profile = await uploadAvatar(formData);
        setAvatarUrl(profile.avatarUrl);
      } catch (err) {
        setAvatarError(err instanceof Error ? err.message : t("avatarError"));
      }
    });
  }

  function handleRemoveAvatar() {
    setAvatarError(null);
    startUpdatingAvatar(async () => {
      try {
        const profile = await removeAvatar();
        setAvatarUrl(profile.avatarUrl);
      } catch (err) {
        setAvatarError(err instanceof Error ? err.message : t("avatarError"));
      }
    });
  }

  function handleSaveUsername() {
    setUsernameError(null);
    setUsernameSaved(false);
    startSavingUsername(async () => {
      try {
        await updateMyUsername(username);
        setUsernameSaved(true);
      } catch (err) {
        setUsernameError(err instanceof Error ? err.message : t("usernameError"));
      }
    });
  }

  const usernameChanged = username.trim() !== initialUsername;

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("photoAndUsernameTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {/* La insignia de cámara da la pista visual de "esto se puede
                tocar" sin depender de hover (no sirve en móvil) — el botón
                de texto de al lado sigue ahí para quien navegue con teclado
                o lector de pantalla. */}
            <div className="relative shrink-0">
              <button
                type="button"
                className="border-border bg-muted focus-visible:ring-ring/50 relative size-20 overflow-hidden rounded-full border transition-opacity hover:opacity-90 focus-visible:ring-3 focus-visible:outline-none disabled:pointer-events-none"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUpdatingAvatar}
                aria-label={t("changePhoto")}
              >
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="size-full object-cover" />
                ) : (
                  <span className="text-muted-foreground flex size-full items-center justify-center text-xl font-medium">
                    {initialUsername.slice(0, 2).toUpperCase()}
                  </span>
                )}
                {isUpdatingAvatar && (
                  <span className="bg-background/70 absolute inset-0 flex items-center justify-center">
                    <Loader2 className="text-foreground size-5 animate-spin" aria-hidden />
                  </span>
                )}
              </button>
              <span
                aria-hidden
                className="border-background bg-primary text-primary-foreground pointer-events-none absolute right-0 bottom-0 flex size-6 items-center justify-center rounded-full border-2"
              >
                <Camera className="size-3.5" />
              </span>
            </div>

            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isUpdatingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="size-4" />
                  {isUpdatingAvatar ? t("uploading") : t("changePhoto")}
                </Button>
                {avatarUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isUpdatingAvatar}
                    onClick={handleRemoveAvatar}
                  >
                    {t("removePhoto")}
                  </Button>
                )}
              </div>
              <p className="text-muted-foreground text-xs">{t("avatarHint")}</p>
            </div>
          </div>
          {avatarError && <p className="text-destructive text-sm">{avatarError}</p>}

          <div className="flex flex-col gap-2">
            <Label htmlFor="profile-username">{t("usernameLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="profile-username"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setUsernameSaved(false);
                  setUsernameError(null);
                }}
                autoComplete="off"
                maxLength={20}
              />
              <Button
                type="button"
                size="sm"
                disabled={!usernameChanged || isSavingUsername}
                onClick={handleSaveUsername}
              >
                {isSavingUsername ? t("saving") : t("save")}
              </Button>
            </div>
            {usernameError ? (
              <p className="text-destructive text-sm">{usernameError}</p>
            ) : (
              <p className="text-muted-foreground text-xs">{t("usernameHint")}</p>
            )}
            {usernameSaved && !usernameError && (
              <p className="text-muted-foreground text-sm">{t("saved")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Aparte de la tarjeta editable a propósito: son datos de solo
          lectura (correo, fecha de alta), no otro formulario más. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("accountTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">{t("emailLabel")}</span>
            <span className="min-w-0 truncate text-right font-medium" title={email}>
              {email}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="text-muted-foreground shrink-0">{t("memberSinceLabel")}</span>
            <span className="font-medium">{memberSince}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

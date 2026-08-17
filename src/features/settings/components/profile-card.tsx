"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { Camera, User } from "lucide-react";
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
}: {
  username: string;
  avatarUrl: string | null;
}) {
  const t = useTranslations("Settings.profile");
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5 text-base">
          <User className="size-4" aria-hidden />
          {t("title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="border-border bg-muted relative size-16 shrink-0 overflow-hidden rounded-full border"
            onClick={() => fileInputRef.current?.click()}
            aria-label={t("changePhoto")}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="size-full object-cover" />
            ) : (
              <span className="text-muted-foreground flex size-full items-center justify-center text-lg font-medium">
                {initialUsername.slice(0, 2).toUpperCase()}
              </span>
            )}
          </button>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />
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
          {usernameError && <p className="text-destructive text-sm">{usernameError}</p>}
          {usernameSaved && !usernameError && (
            <p className="text-muted-foreground text-sm">{t("saved")}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

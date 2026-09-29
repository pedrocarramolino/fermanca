"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { sendFriendRequestByCode } from "@/features/community/application/actions";

export function AddFriendForm() {
  const t = useTranslations("Community.addFriend");
  const tRequest = useTranslations("Community.friendRequest");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    if (!code.trim()) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      try {
        const result = await sendFriendRequestByCode(code);
        if (!result.ok) {
          setError(tRequest(result.error));
          return;
        }
        setCode("");
        setSuccess(result.status === "accepted" ? tRequest("accepted") : t("success"));
      } catch {
        setError(t("genericError"));
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value.toUpperCase())}
          placeholder={t("placeholder")}
          maxLength={6}
          className="font-mono tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal"
        />
        <Button type="button" onClick={handleSubmit} disabled={isPending || !code.trim()}>
          <UserPlus className="size-4" />
          {isPending ? t("sending") : t("add")}
        </Button>
      </div>
      {error && <p className="text-destructive text-sm">{error}</p>}
      {success && <p className="text-primary text-sm">{success}</p>}
    </div>
  );
}

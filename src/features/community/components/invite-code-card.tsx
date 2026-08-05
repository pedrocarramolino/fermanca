"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShareInviteButton } from "@/features/community/components/share-invite-button";

export function InviteCodeCard({ inviteCode }: { inviteCode: string }) {
  const t = useTranslations("Community.invite");
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <span className="bg-muted rounded-lg px-4 py-2 font-mono text-xl tracking-widest">
            {inviteCode}
          </span>
          <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? t("copied") : t("copy")}
          </Button>
        </div>
        <ShareInviteButton inviteCode={inviteCode} />
      </CardContent>
    </Card>
  );
}

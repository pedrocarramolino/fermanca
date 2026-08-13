"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Globe, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function canShareNatively(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Mismo patrón que ShareSessionButton: share nativo si el navegador lo
 * soporta (así aparecen WhatsApp, Telegram, etc. de verdad, algo que un
 * enlace web no puede ofrecer por sí solo), y si no, un menú con
 * WhatsApp/Facebook/copiar enlace para escritorio. */
export function ShareInviteButton({ inviteCode }: { inviteCode: string }) {
  const t = useTranslations("Share");
  const [copied, setCopied] = useState(false);
  const [canNativeShare] = useState(canShareNatively);
  const [joinUrl] = useState(() =>
    typeof window === "undefined" ? "" : `${window.location.origin}/community/join/${inviteCode}`,
  );

  const shareText = t("inviteText");

  async function handleNativeShare() {
    try {
      await navigator.share({ title: "Fermança", text: shareText, url: joinUrl });
    } catch {
      // El usuario canceló el selector nativo — no es un error que mostrar.
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (canNativeShare) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={handleNativeShare}>
        <Share2 className="size-4" />
        {t("link")}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Share2 className="size-4" />
        {t("link")}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          render={
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${joinUrl}`)}`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <MessageCircle className="size-4" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          render={
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(joinUrl)}`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <Globe className="size-4" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("linkCopied") : t("copyLink")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

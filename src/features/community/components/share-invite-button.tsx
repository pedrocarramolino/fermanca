"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Globe, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** Mismo patrón que ShareSessionButton: share nativo si el navegador lo
 * soporta (así aparecen WhatsApp, Telegram, etc. de verdad, algo que un
 * enlace web no puede ofrecer por sí solo), y si no, un menú con
 * WhatsApp/Facebook/copiar enlace para escritorio. */
export function ShareInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [joinUrl, setJoinUrl] = useState("");

  useEffect(() => {
    setCanNativeShare(typeof navigator.share === "function");
    setJoinUrl(`${window.location.origin}/community/join/${inviteCode}`);
  }, [inviteCode]);

  const shareText = "Únete a mis amigos en PracticeFlow 🎵";

  async function handleNativeShare() {
    try {
      await navigator.share({ title: "PracticeFlow", text: shareText, url: joinUrl });
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
        Compartir enlace
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Share2 className="size-4" />
        Compartir enlace
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
          {copied ? "Enlace copiado" : "Copiar enlace"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

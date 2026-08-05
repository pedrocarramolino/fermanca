"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Check, Copy, Download, Globe, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDurationShort } from "@/core/domain/duration";
import { getCurrentStreakDays } from "@/features/session-timer/application/actions";
import { generateSessionShareCardBlob } from "@/features/session-timer/lib/session-share-card";

function canShareNatively(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function ShareSessionButton({
  sessionId,
  totalSeconds,
  blockCount,
  blocks,
}: {
  sessionId: string;
  totalSeconds: number;
  blockCount: number;
  blocks: { name: string; color: string; actualDurationSeconds: number }[];
}) {
  const t = useTranslations("Share");
  const [streak, setStreak] = useState(0);
  const [copied, setCopied] = useState(false);
  const [canNativeShare] = useState(canShareNatively);
  const [shareUrl] = useState(() =>
    typeof window === "undefined" ? "" : `${window.location.origin}/compartir/${sessionId}`,
  );
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    void getCurrentStreakDays()
      .then(setStreak)
      .catch(() => {
        // Solo decora el texto/tarjeta a compartir — si falla, se comparte sin racha.
      });
  }, []);

  const shareText = `${t("sessionText", { duration: formatDurationShort(totalSeconds), count: blockCount })} 💪${
    streak > 1 ? ` 🔥 ${t("streakSuffix", { count: streak })}` : ""
  }`;

  async function buildCardFile(): Promise<File | null> {
    const blob = await generateSessionShareCardBlob({
      totalSeconds,
      blockCount,
      blocks,
      streakDays: streak,
    });
    if (!blob) return null;
    return new File([blob], "practiceflow-sesion.png", { type: "image/png" });
  }

  /** Instagram (y el resto de apps) solo aparecen como destino real si se
   * comparte una IMAGEN — un enlace de texto no se puede "subir a una
   * historia". Si el navegador no admite compartir archivos, se cae al
   * texto+enlace de siempre en vez de fallar. */
  async function handleNativeShare() {
    setIsBusy(true);
    try {
      const file = await buildCardFile();
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "PracticeFlow", text: shareText, files: [file] });
      } else {
        await navigator.share({ title: "PracticeFlow", text: shareText, url: shareUrl });
      }
    } catch {
      // El usuario canceló el selector nativo — no es un error que mostrar.
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDownloadImage() {
    setIsBusy(true);
    try {
      const file = await buildCardFile();
      if (!file) return;
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (canNativeShare) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={handleNativeShare} disabled={isBusy}>
        <Share2 className="size-4" />
        {t("session")}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button type="button" variant="outline" size="sm" />}>
        <Share2 className="size-4" />
        {t("session")}
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem
          render={
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`}
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
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noreferrer"
            />
          }
        >
          <Globe className="size-4" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadImage} disabled={isBusy}>
          <Download className="size-4" />
          {t("downloadImage")}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopy}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? t("linkCopied") : t("copyLink")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

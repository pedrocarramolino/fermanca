"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Download, Loader2, Rss, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentStreakDays } from "@/features/session-timer/application/actions";
import {
  getMyWeeklyGoalShare,
  shareWeeklyGoalToFeed,
  unshareWeeklyGoalFromFeed,
} from "@/features/feed/application/actions";
import { generateWeeklyGoalShareCardBlob } from "@/features/weekly-goals/lib/weekly-goal-share-card";
import type { WeeklyGoal, WeeklyGoalProgress } from "@/core/domain/weekly-goal";

function canShareNatively(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Se muestra solo una vez marcado el objetivo como completado (ver
 * WeeklyGoalCard) — ofrece las dos vías de compartir que ya existen para
 * una sesión suelta (ShareToFeedButton / ShareSessionButton), adaptadas a un
 * objetivo semanal: no hay `sessionId` ni bloques, así que no hay título
 * personalizable ni enlace público, y "otra app" siempre manda una imagen
 * (generada al vuelo), nunca texto+enlace — un objetivo no tiene una URL
 * propia que enseñar. */
export function ShareWeeklyGoalButton({
  goal,
  progress,
}: {
  goal: WeeklyGoal;
  progress: WeeklyGoalProgress;
}) {
  const t = useTranslations("WeeklyGoal");
  const [shareId, setShareId] = useState<string | null | undefined>(undefined);
  const [streak, setStreak] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isBusy, setIsBusy] = useState(false);
  const [canNativeShare] = useState(canShareNatively);

  useEffect(() => {
    void getMyWeeklyGoalShare(goal.weekStart)
      .then((share) => setShareId(share?.id ?? null))
      .catch(() => setShareId(null));
    void getCurrentStreakDays()
      .then(setStreak)
      .catch(() => {
        // Solo decora la tarjeta a compartir — si falla, se comparte sin racha.
      });
  }, [goal.weekStart]);

  function handleShareToFeed() {
    startTransition(async () => {
      const share = await shareWeeklyGoalToFeed({
        weekStart: goal.weekStart,
        targetDays: goal.targetDays,
        targetSeconds: goal.targetSeconds,
        practicedDays: progress.practicedDays,
        practicedSeconds: progress.practicedSeconds,
        streakDays: streak,
      });
      setShareId(share.id);
    });
  }

  function handleUnshareFromFeed() {
    if (!shareId) return;
    startTransition(async () => {
      await unshareWeeklyGoalFromFeed(shareId);
      setShareId(null);
    });
  }

  async function buildCardFile(): Promise<File | null> {
    const blob = await generateWeeklyGoalShareCardBlob({
      targetDays: goal.targetDays,
      targetSeconds: goal.targetSeconds,
      practicedDays: progress.practicedDays,
      practicedSeconds: progress.practicedSeconds,
      streakDays: streak,
    });
    if (!blob) return null;
    return new File([blob], "fermanca-objetivo.png", { type: "image/png" });
  }

  async function handleNativeShare() {
    setIsBusy(true);
    try {
      const file = await buildCardFile();
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title: "Fermança", files: [file] });
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

  // undefined = todavía comprobando si ya está compartido — no se muestra
  // nada hasta saberlo, para no parpadear de un estado al otro.
  if (shareId === undefined) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {shareId ? (
        <Button type="button" variant="outline" size="sm" onClick={handleUnshareFromFeed} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
          {isPending ? t("unsharingFromFeed") : t("unshareFromFeed")}
        </Button>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={handleShareToFeed} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Rss className="size-4" />}
          {isPending ? t("sharingToFeed") : t("shareToFeed")}
        </Button>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={canNativeShare ? handleNativeShare : handleDownloadImage}
        disabled={isBusy}
      >
        {isBusy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : canNativeShare ? (
          <Share2 className="size-4" />
        ) : (
          <Download className="size-4" />
        )}
        {canNativeShare ? t("shareToApp") : t("downloadImage")}
      </Button>
    </div>
  );
}

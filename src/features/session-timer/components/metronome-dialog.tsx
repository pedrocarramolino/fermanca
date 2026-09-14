"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, useReducedMotion } from "motion/react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useMetronome } from "@/features/session-timer/hooks/use-metronome";

/** iPadOS 13+ se identifica como "MacIntel" (mismo user agent que un Mac de
 * verdad) — solo `maxTouchPoints > 1` lo distingue de un Mac real, que no
 * tiene pantalla táctil. */
function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function MetronomeDialog({
  open,
  onOpenChange,
  volumePercent,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  volumePercent: number;
}) {
  const t = useTranslations("Metronome");
  const reduceMotion = useReducedMotion();
  const { bpm, setBpm, minBpm, maxBpm, isPlaying, start, stop, beat } = useMetronome();
  // navigator no existe en el servidor — se calcula tras hidratar, como el
  // resto de detecciones de plataforma en la app (ver HomeGreeting).
  const [showIOSHint, setShowIOSHint] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShowIOSHint(isIOS());
  }, []);

  function handleToggle() {
    if (isPlaying) {
      stop();
    } else {
      void start(volumePercent);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) stop();
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center">
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
          {showIOSHint && (
            <p className="text-muted-foreground text-xs">{t("iosSilentHint")}</p>
          )}
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <div className="flex size-12 items-center justify-center" aria-hidden>
            {isPlaying && (
              <motion.span
                key={beat}
                className="bg-primary block size-4 rounded-full"
                initial={reduceMotion ? { scale: 1, opacity: 0.7 } : { scale: 1.6, opacity: 1 }}
                animate={{ scale: 1, opacity: 0.6 }}
                transition={{ duration: Math.min(0.5, 60 / bpm), ease: "easeOut" }}
              />
            )}
          </div>

          <div className="flex flex-col items-center">
            <span className="text-3xl font-semibold tabular-nums">{bpm}</span>
            <span className="text-muted-foreground text-xs">{t("bpm")}</span>
          </div>

          <Slider
            className="w-full"
            aria-label={t("bpm")}
            value={[bpm]}
            min={minBpm}
            max={maxBpm}
            step={1}
            onValueChange={(value) => setBpm(Array.isArray(value) ? value[0]! : value)}
          />

          <Button type="button" size="lg" className="w-full" onClick={handleToggle}>
            {isPlaying ? <Square className="size-4" /> : <Play className="size-4" />}
            {isPlaying ? t("stop") : t("start")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

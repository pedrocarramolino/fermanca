"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Verde luciérnaga — no toma el color de acento del usuario a propósito:
 * es la identidad fija de la mascota, igual que su nombre. */
const FIREFLY_GLOW = "oklch(0.82 0.24 142)";
const FIREFLY_CORE = "oklch(0.62 0.19 142)";

/** ~72 "pulsaciones" por minuto — un metrónomo lento y tranquilo, no un
 * parpadeo nervioso. Attack rápido (18% del ciclo) y decay más largo, para
 * que se lea como un latido/tic y no como una respiración simétrica. */
const BEAT_SECONDS = 0.83;
const BEAT_TIMES = [0, 0.18, 1];

/**
 * Mascota de Pulso: una luciérnaga cuya luz late al ritmo de un metrónomo.
 * `intensity` (0-1, normalmente la racha actual normalizada) crece el halo
 * y su brillo — pero nunca lo apaga del todo ni por debajo de un mínimo
 * visible: Pulso no castiga los días sin practicar, así que su luz jamás se
 * apaga, solo brilla algo menos.
 *
 * `reduceMotion` congela las animaciones en su punto medio en vez de
 * decidirlo con CSS: Motion anima por RAF, no por `transition`/`animation`
 * de CSS, así que la red de seguridad global de `prefers-reduced-motion` en
 * globals.css no lo alcanza (ver bottom-nav.tsx).
 */
export function PulsoOrb({
  intensity = 0,
  reduceMotion,
  className,
}: {
  intensity?: number;
  reduceMotion: boolean;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(1, intensity));
  // Nunca por debajo de 0.35: una luciérnaga sin racha sigue brillando.
  const glow = 0.35 + clamped * 0.65;

  return (
    <span className={cn("relative block size-14", className)}>
      <motion.span
        aria-hidden
        className="absolute inset-[-40%] rounded-full blur-lg"
        style={{ background: `radial-gradient(circle, ${FIREFLY_GLOW}, transparent 70%)` }}
        initial={false}
        animate={
          reduceMotion
            ? { scale: 1 + glow * 0.3, opacity: glow }
            : { scale: [1, 1 + glow * 0.55, 1 + glow * 0.3], opacity: [glow * 0.6, glow, glow * 0.6] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: BEAT_SECONDS, times: BEAT_TIMES, repeat: Infinity, ease: "easeOut" }
        }
      />
      <motion.span
        aria-hidden
        className="ring-background/40 absolute inset-[30%] rounded-full shadow-lg ring-2"
        style={{ backgroundColor: FIREFLY_CORE }}
        initial={false}
        animate={
          reduceMotion
            ? { scale: 1 }
            : { scale: [1, 1.16, 1.05] }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: BEAT_SECONDS, times: BEAT_TIMES, repeat: Infinity, ease: "easeOut" }
        }
      >
        <span className="bg-background/70 absolute top-[22%] left-[26%] size-[22%] rounded-full blur-[1px]" />
      </motion.span>
    </span>
  );
}

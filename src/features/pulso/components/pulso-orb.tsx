"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Verde luciérnaga — no toma el color de acento del usuario a propósito:
 * es la identidad fija de la mascota, igual que su nombre. */
const FIREFLY_GLOW = "oklch(0.85 0.25 142)";
const FIREFLY_CORE = "oklch(0.68 0.21 142)";

/** ~72 "pulsaciones" por minuto — un metrónomo lento y tranquilo, no un
 * parpadeo nervioso. Attack rápido (18% del ciclo) y decay más largo, para
 * que se lea como un latido/tic y no como una respiración simétrica. */
const BEAT_SECONDS = 0.83;
const BEAT_TIMES = [0, 0.18, 1];

/** Radio y difusión del halo (px) en los dos extremos de racha — incluso en
 * el mínimo tiene que leerse como una luz de verdad, nunca como un punto
 * plano sin brillo; en el máximo, un salto claro respecto al mínimo. */
const GLOW_RADIUS = { min: 12, max: 28 };
const GLOW_SPREAD = { min: 4, max: 11 };

function glowShadow(radius: number, spread: number): string {
  return `0 0 ${radius}px ${spread}px ${FIREFLY_GLOW}`;
}

/**
 * Mascota de Pulso: una luciérnaga cuya luz late al ritmo de un metrónomo.
 * El brillo (`box-shadow` sobre un núcleo sólido, no una capa aparte
 * difuminada) se ve bien sobre cualquier fondo, claro u oscuro — un halo
 * real, no un punto de color plano. `intensity` (0-1, la racha actual
 * normalizada) hace crecer ese halo, pero nunca por debajo de un mínimo ya
 * de por sí visible: Pulso no castiga los días sin practicar apagándose.
 *
 * `reduceMotion` congela el latido en su punto medio en vez de decidirlo
 * con CSS: Motion anima por RAF, no por `transition`/`animation` de CSS,
 * así que la red de seguridad global de `prefers-reduced-motion` en
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
  const radius = GLOW_RADIUS.min + clamped * (GLOW_RADIUS.max - GLOW_RADIUS.min);
  const spread = GLOW_SPREAD.min + clamped * (GLOW_SPREAD.max - GLOW_SPREAD.min);

  return (
    <span className={cn("relative flex size-14 items-center justify-center", className)}>
      <motion.span
        aria-hidden
        className="relative block size-[38%] rounded-full"
        style={{ backgroundColor: FIREFLY_CORE }}
        initial={false}
        animate={
          reduceMotion
            ? { scale: 1, boxShadow: glowShadow(radius, spread) }
            : {
                scale: [1, 1.18, 1.05],
                boxShadow: [
                  glowShadow(radius * 0.7, spread * 0.7),
                  glowShadow(radius * 1.15, spread * 1.15),
                  glowShadow(radius, spread),
                ],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: BEAT_SECONDS, times: BEAT_TIMES, repeat: Infinity, ease: "easeOut" }
        }
      >
        <span className="bg-background/70 absolute top-[18%] left-[22%] size-[28%] rounded-full blur-[0.5px]" />
      </motion.span>
    </span>
  );
}

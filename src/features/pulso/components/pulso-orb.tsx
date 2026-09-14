"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Colores fijos de la ilustración de Pulso — no toman el acento del
 * usuario a propósito: son la identidad visual de la mascota, igual que su
 * nombre. */
const FIREFLY_DARK = "oklch(0.2 0.04 155)";
const FIREFLY_MINT = "oklch(0.82 0.18 155)";
const FIREFLY_MINT_BRIGHT = "oklch(0.88 0.22 155)";

/** ~72 "pulsaciones" por minuto — un metrónomo lento y tranquilo, no un
 * parpadeo nervioso. Attack rápido (18% del ciclo) y decay más largo, para
 * que se lea como un latido/tic y no como una respiración simétrica. */
const BEAT_SECONDS = 0.83;
const BEAT_TIMES = [0, 0.18, 1];

/** Radio y difusión del halo (px) en los dos extremos de racha — incluso en
 * el mínimo tiene que leerse como una luz de verdad, nunca como un punto
 * plano sin brillo; en el máximo, un salto claro respecto al mínimo. */
const GLOW_RADIUS = { min: 10, max: 22 };
const GLOW_SPREAD = { min: 2, max: 7 };

function glowFilter(radius: number, spread: number): string {
  return `drop-shadow(0 0 ${radius}px ${FIREFLY_MINT}) drop-shadow(0 0 ${spread}px ${FIREFLY_MINT})`;
}

/**
 * Mascota de Pulso: una luciérnaga — misma ilustración que en el flujo de
 * referencia (cuerpo oscuro redondeado, "ala"/cuerpo menta asomando detrás,
 * antenas con la punta luminosa, ojos y sonrisa). El brillo alrededor
 * (`drop-shadow`, no una capa aparte difuminada) late al ritmo de un
 * metrónomo en las puntas de las antenas — su verdadero órgano de luz — y
 * crece con `intensity` (0-1, la racha actual normalizada), pero nunca por
 * debajo de un mínimo ya de por sí visible: Pulso no castiga los días sin
 * practicar apagándose.
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

  const glowAnimate = reduceMotion
    ? { filter: glowFilter(radius, spread) }
    : {
        filter: [
          glowFilter(radius * 0.7, spread * 0.7),
          glowFilter(radius * 1.2, spread * 1.2),
          glowFilter(radius, spread),
        ],
      };
  const tipAnimate = reduceMotion ? { scale: 1 } : { scale: [1, 1.35, 1.1] };
  const beatTransition = reduceMotion
    ? { duration: 0 }
    : { duration: BEAT_SECONDS, times: BEAT_TIMES, repeat: Infinity, ease: "easeOut" as const };

  return (
    <span className={cn("relative block size-14", className)}>
      <motion.svg
        viewBox="0 0 100 100"
        className="size-full overflow-visible"
        initial={false}
        animate={glowAnimate}
        transition={beatTransition}
      >
        {/* "Ala"/cuerpo menta, se asoma por detrás del cuerpo oscuro */}
        <ellipse cx="66" cy="62" rx="31" ry="29" fill={FIREFLY_MINT} />
        {/* Cuerpo oscuro */}
        <circle cx="46" cy="49" r="30" fill={FIREFLY_DARK} />
        {/* Antenas, con la punta como único órgano de luz que de verdad late */}
        <path
          d="M39 25 C 32 13, 23 8, 16 10"
          stroke={FIREFLY_DARK}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M57 23 C 66 10, 77 7, 85 10"
          stroke={FIREFLY_DARK}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <motion.circle
          cx="15"
          cy="10"
          r="5"
          fill={FIREFLY_MINT_BRIGHT}
          initial={false}
          animate={tipAnimate}
          transition={beatTransition}
          style={{ transformOrigin: "15px 10px" }}
        />
        <motion.circle
          cx="86"
          cy="10"
          r="5"
          fill={FIREFLY_MINT_BRIGHT}
          initial={false}
          animate={tipAnimate}
          transition={beatTransition}
          style={{ transformOrigin: "86px 10px" }}
        />
        {/* Ojos */}
        <ellipse cx="35" cy="47" rx="8.5" ry="10" fill="white" />
        <ellipse cx="58" cy="47" rx="8.5" ry="10" fill="white" />
        <circle cx="35" cy="49" r="3.4" fill={FIREFLY_DARK} />
        <circle cx="58" cy="49" r="3.4" fill={FIREFLY_DARK} />
        {/* Sonrisa */}
        <path
          d="M31 61 Q 46.5 75, 62 61"
          stroke={FIREFLY_MINT}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
      </motion.svg>
    </span>
  );
}

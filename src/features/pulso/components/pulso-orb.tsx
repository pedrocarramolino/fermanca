"use client";

import { useId } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Colores fijos de la ilustración de Pulso — no toman el acento del
 * usuario a propósito: son la identidad visual de la mascota, igual que su
 * nombre. */
const FIREFLY_DARK = "oklch(0.18 0.03 155)";
const FIREFLY_MINT = "oklch(0.82 0.18 155)";

/** El verde de la luciérnaga en un solo tono: lo único que cambia con la
 * intensidad es cuánta luz tiene (claridad y saturación). */
const MINT_HUE = 155;
function mint(lightness: number, chroma: number): string {
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} ${MINT_HUE})`;
}
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}
/** Cada pieza luminosa, con su valor apagado y su valor a pleno brillo
 * [claridad, saturación]. Apagada NO es negra: es un verde oscuro y sin
 * vida, para que la mascota se lea como "la luz está apagada" y no como un
 * error de dibujo. */
const OFF_ON = {
  bodyCenter: { off: [0.32, 0.035], on: [0.9, 0.24] },
  bodyMid: { off: [0.28, 0.03], on: [0.82, 0.18] },
  bodyEdge: { off: [0.22, 0.025], on: [0.4, 0.1] },
  wingInner: { off: [0.3, 0.03], on: [0.9, 0.24] },
  wingOuter: { off: [0.22, 0.02], on: [0.4, 0.1] },
  tip: { off: [0.34, 0.04], on: [0.9, 0.24] },
  smile: { off: [0.42, 0.05], on: [0.82, 0.18] },
} as const;
function litColor(key: keyof typeof OFF_ON, t: number): string {
  const { off, on } = OFF_ON[key];
  return mint(lerp(off[0], on[0], t), lerp(off[1], on[1], t));
}

/** ~72 "pulsaciones" por minuto — un metrónomo lento y tranquilo, no un
 * parpadeo nervioso. Attack rápido (18% del ciclo) y decay más largo, para
 * que se lea como un latido/tic y no como una respiración simétrica. */
const BEAT_SECONDS = 0.83;
const BEAT_TIMES = [0, 0.18, 1];

/** Radio y difusión del halo (px) en los dos extremos. El mínimo es CERO a
 * propósito: sin horas practicadas esta semana la luz está apagada del todo,
 * y cada hora la va encendiendo. */
const GLOW_RADIUS = { min: 0, max: 26 };
const GLOW_SPREAD = { min: 0, max: 9 };

function glowFilter(radius: number, spread: number): string {
  return `drop-shadow(0 0 ${radius}px ${FIREFLY_MINT}) drop-shadow(0 0 ${spread}px ${FIREFLY_MINT})`;
}

/**
 * Mascota de Pulso: una luciérnaga con el cuerpo inferior iluminado desde
 * dentro (degradado radial, más brillante en el centro) en vez de un simple
 * relleno plano — el efecto "bombilla" del diseño de referencia — con un
 * pequeño resplandor en el suelo debajo, como si de verdad desprendiera luz.
 * El brillo alrededor (`drop-shadow`, no una capa aparte difuminada) late al
 * ritmo de un metrónomo en las puntas de las antenas — su verdadero órgano
 * de luz.
 *
 * `intensity` (0-1) son las horas practicadas esta semana sobre el tope (ver
 * HOURS_FOR_FULL_GLOW en pulso-widget.tsx), y apaga o enciende la mascota
 * ENTERA: halo, cuerpo, alas, antenas y el resplandor del suelo. A 0 la luz
 * está apagada del todo y solo queda la silueta; cada hora practicada la
 * sube un poco. Antes el brillo venía de la racha y nunca bajaba de un
 * mínimo siempre encendido — a propósito, para no castigar los días sin
 * practicar; ahora empezar la semana a oscuras es justo lo que se quiere
 * transmitir.
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
  // Estable entre renders y sin colisionar con otras instancias en la misma
  // página (el disparador flotante y la cabecera del diálogo conviven a la
  // vez) — a diferencia de un contador manual, no cambia en cada render.
  const gradientId = useId();
  const wingGradientId = useId();

  const bodyCenter = litColor("bodyCenter", clamped);
  const bodyMid = litColor("bodyMid", clamped);
  const bodyEdge = litColor("bodyEdge", clamped);
  const wingInner = litColor("wingInner", clamped);
  const wingOuter = litColor("wingOuter", clamped);
  const tipColor = litColor("tip", clamped);
  const smileColor = litColor("smile", clamped);
  // El charco de luz del suelo solo existe si hay luz que lo proyecte.
  const groundGlowOpacity = 0.35 * clamped;

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
        <defs>
          <radialGradient id={gradientId} cx="50%" cy="30%" r="70%">
            <stop offset="0%" stopColor={bodyCenter} />
            <stop offset="50%" stopColor={bodyMid} />
            <stop offset="100%" stopColor={bodyEdge} />
          </radialGradient>
          <radialGradient id={wingGradientId} cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor={wingInner} stopOpacity="0.9" />
            <stop offset="100%" stopColor={wingOuter} stopOpacity="0.55" />
          </radialGradient>
        </defs>

        {/* Resplandor en el suelo, como si la luz de verdad cayera ahí. */}
        <ellipse
          cx="50"
          cy="94"
          rx="19"
          ry="5"
          fill={FIREFLY_MINT}
          opacity={groundGlowOpacity}
          style={{ filter: "blur(3px)" }}
        />

        {/* Alas, translúcidas, flanqueando el cuerpo. */}
        <ellipse
          cx="24"
          cy="63"
          rx="15"
          ry="21"
          fill={`url(#${wingGradientId})`}
          transform="rotate(-24 24 63)"
        />
        <ellipse
          cx="76"
          cy="63"
          rx="15"
          ry="21"
          fill={`url(#${wingGradientId})`}
          transform="rotate(24 76 63)"
        />

        {/* Cuerpo inferior, iluminado desde dentro — centrado y asomando
            por debajo de la cabeza, no desplazado a un lado. */}
        <ellipse cx="50" cy="76" rx="23" ry="21" fill={`url(#${gradientId})`} />

        {/* Cabeza oscura */}
        <circle cx="50" cy="43" r="27" fill={FIREFLY_DARK} />

        {/* Antenas, simétricas, con la punta como único órgano de luz que
            de verdad late. */}
        <path
          d="M40 20 C 32 9, 23 5, 16 7"
          stroke={FIREFLY_DARK}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M60 20 C 68 9, 77 5, 84 7"
          stroke={FIREFLY_DARK}
          strokeWidth="3"
          fill="none"
          strokeLinecap="round"
        />
        <motion.circle
          cx="15"
          cy="7"
          r="5.5"
          fill={tipColor}
          initial={false}
          animate={tipAnimate}
          transition={beatTransition}
          style={{ transformOrigin: "15px 7px" }}
        />
        <motion.circle
          cx="85"
          cy="7"
          r="5.5"
          fill={tipColor}
          initial={false}
          animate={tipAnimate}
          transition={beatTransition}
          style={{ transformOrigin: "85px 7px" }}
        />

        {/* Ojos: ovalados, blancos, con pupila y un pequeño brillo. */}
        <ellipse cx="38" cy="41" rx="7.5" ry="9.5" fill="white" />
        <ellipse cx="62" cy="41" rx="7.5" ry="9.5" fill="white" />
        <circle cx="38" cy="43" r="3.2" fill={FIREFLY_DARK} />
        <circle cx="62" cy="43" r="3.2" fill={FIREFLY_DARK} />
        <circle cx="36.3" cy="41" r="1.1" fill="white" />
        <circle cx="60.3" cy="41" r="1.1" fill="white" />

        {/* Sonrisa */}
        <path
          d="M40 55 Q 50 63, 60 55"
          stroke={smileColor}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </motion.svg>
    </span>
  );
}

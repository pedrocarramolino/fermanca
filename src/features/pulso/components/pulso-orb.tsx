"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Mascota de Pulso: un orbe líquido animado (gradiente cónico rotando +
 * "respiración" de escala) con dos puntos que leen como ojos — sin depender
 * de ningún asset de imagen. `reduceMotion` congela las dos animaciones en
 * su estado inicial en vez de decidirlo con CSS: Motion anima por RAF, no
 * por `transition`/`animation` de CSS, así que la red de seguridad global de
 * `prefers-reduced-motion` en globals.css no lo alcanza (ver bottom-nav.tsx).
 */
export function PulsoOrb({
  reduceMotion,
  className,
}: {
  reduceMotion: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "ring-border relative block size-14 overflow-hidden rounded-full shadow-lg ring-1",
        className,
      )}
    >
      <motion.span
        aria-hidden
        className="absolute inset-[-35%] rounded-full blur-md"
        style={{
          background:
            "conic-gradient(from 0deg, var(--primary), var(--accent), var(--category-flexibility, var(--primary)), var(--primary))",
        }}
        initial={false}
        animate={reduceMotion ? { rotate: 0 } : { rotate: 360 }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 7, repeat: Infinity, ease: "linear" }
        }
      />
      <motion.span
        aria-hidden
        className="bg-background/50 absolute inset-[18%] rounded-full backdrop-blur-sm"
        initial={false}
        animate={reduceMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
        transition={
          reduceMotion ? { duration: 0 } : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <span className="absolute inset-0 flex items-center justify-center gap-1.5">
        <span className="bg-foreground/80 size-1.5 rounded-full" />
        <span className="bg-foreground/80 size-1.5 rounded-full" />
      </span>
    </span>
  );
}

"use client";

import type { SoundChoice } from "@/core/domain/user-settings";

/**
 * Tonos sintetizados con la Web Audio API, no clips de audio grabados: evita
 * tener que conseguir/licenciar muestras reales para el MVP. La arquitectura
 * (una función por sonido) permite sustituir cualquiera de estos por un
 * `new Audio(url).play()` más adelante sin tocar quien los llama.
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  audioContext ??= new AudioContext();
  return audioContext;
}

/** Debe llamarse desde un gesto real del usuario (p. ej. el click de "Comenzar
 * sesión") para desbloquear el audio antes de que el motor intente reproducir
 * sonidos de forma programática al terminar cada bloque. */
export async function unlockAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (ctx?.state === "suspended") await ctx.resume();
}

export function isAudioUnlocked(): boolean {
  return getAudioContext()?.state === "running";
}

function tone(
  ctx: AudioContext,
  {
    freq,
    duration,
    type,
    peak,
    delay = 0,
  }: {
    freq: number;
    duration: number;
    type: OscillatorType;
    peak: number;
    delay?: number;
  },
) {
  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peak, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playNotificationSound(sound: SoundChoice, volumePercent: number) {
  if (sound === "none") return;
  const ctx = getAudioContext();
  if (!ctx) return;
  const v = Math.max(0, Math.min(1, volumePercent / 100));

  switch (sound) {
    case "classic":
      tone(ctx, { freq: 880, duration: 0.22, type: "sine", peak: 0.4 * v });
      tone(ctx, { freq: 1108, duration: 0.28, type: "sine", peak: 0.4 * v, delay: 0.15 });
      break;
    case "bell":
      tone(ctx, { freq: 1760, duration: 1.4, type: "sine", peak: 0.5 * v });
      tone(ctx, { freq: 2637, duration: 1.2, type: "sine", peak: 0.15 * v });
      break;
    case "metronome":
      tone(ctx, { freq: 1000, duration: 0.06, type: "square", peak: 0.5 * v });
      break;
    case "piano":
      tone(ctx, { freq: 523.25, duration: 0.7, type: "triangle", peak: 0.45 * v });
      break;
  }
}

export function vibrate(enabled: boolean) {
  if (!enabled) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(200);
  }
}

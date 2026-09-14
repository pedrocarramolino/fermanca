"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAudioContext, unlockAudio } from "@/features/session-timer/application/sounds";

const MIN_BPM = 40;
const MAX_BPM = 220;
const DEFAULT_BPM = 100;

/** Cada cuánto se revisa si toca agendar el siguiente clic (ms) — solo
 * dispara la comprobación, no decide el instante exacto del sonido. */
const POLL_INTERVAL_MS = 25;
/** Cuánto por delante del reloj real del AudioContext se agenda cada clic
 * (segundos) — bastante para no quedarse corto aunque el hilo de JS se
 * retrase un poco, poco para poder parar o cambiar de BPM casi al
 * instante. Técnica estándar para audio con precisión de muestra en el
 * navegador ("A Tale of Two Clocks", Chris Wilson): el setInterval de aquí
 * es de baja precisión a propósito — el sonido en sí se agenda con
 * ctx.currentTime, que sí lo es. */
const SCHEDULE_AHEAD_SECONDS = 0.1;
const CLICK_DURATION_SECONDS = 0.05;

/**
 * Metrónomo con BPM ajustable en caliente (el cambio de tempo se aplica al
 * siguiente clic agendado, sin reiniciar). El sonido reutiliza el mismo
 * AudioContext que el resto de la app (ver sounds.ts): `start` llama a
 * `unlockAudio()` como parte del gesto real de tocar "Iniciar", así el
 * primer clic siempre suena, sin necesitar un botón de desbloqueo aparte.
 */
export function useMetronome() {
  const [bpm, setBpmState] = useState(DEFAULT_BPM);
  const [isPlaying, setIsPlaying] = useState(false);
  const [beat, setBeat] = useState(0);

  const bpmRef = useRef(bpm);
  useEffect(() => {
    bpmRef.current = bpm;
  }, [bpm]);

  const nextNoteTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const beatTimeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const setBpm = useCallback((value: number) => {
    setBpmState(Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(value))));
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    beatTimeoutsRef.current.forEach(clearTimeout);
    beatTimeoutsRef.current = [];
    setIsPlaying(false);
  }, []);

  const start = useCallback(async (volumePercent: number) => {
    await unlockAudio();
    const ctx = getAudioContext();
    if (!ctx || timerRef.current !== null) return;

    const v = Math.max(0, Math.min(1, volumePercent / 100));
    nextNoteTimeRef.current = ctx.currentTime + 0.05;

    timerRef.current = setInterval(() => {
      while (nextNoteTimeRef.current < ctx.currentTime + SCHEDULE_AHEAD_SECONDS) {
        const time = nextNoteTimeRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = 1000;
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.5 * v, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + CLICK_DURATION_SECONDS);
        osc.connect(gain).connect(ctx.destination);
        osc.start(time);
        osc.stop(time + CLICK_DURATION_SECONDS + 0.02);

        // El pulso visual no necesita precisión de muestra — un setTimeout
        // normal (a diferencia del audio, agendado arriba con
        // ctx.currentTime) es de sobra para que se vea sincronizado a ojo.
        const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
        beatTimeoutsRef.current.push(setTimeout(() => setBeat((b) => b + 1), delayMs));

        nextNoteTimeRef.current += 60 / bpmRef.current;
      }
    }, POLL_INTERVAL_MS);
    setIsPlaying(true);
  }, []);

  // Si el componente que usa el hook se desmonta con el metrónomo sonando
  // (p. ej. termina la fase), corta el intervalo — si no, seguiría
  // agendando clics para siempre en segundo plano.
  useEffect(() => stop, [stop]);

  return { bpm, setBpm, minBpm: MIN_BPM, maxBpm: MAX_BPM, isPlaying, start, stop, beat };
}

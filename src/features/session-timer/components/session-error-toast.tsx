"use client";

import { useEffect, useRef } from "react";

const AUTO_DISMISS_MS = 5000;

/** Aviso de error para las mutaciones del cronómetro que antes fallaban en
 * silencio (solo `console.error`) pese a haber ya actualizado la UI de forma
 * optimista — mismo patrón visual/de temporización que CoopNoticeToast, pero
 * en rojo y con `role="alert"` en vez de "status" al tratarse de un fallo. */
export function SessionErrorToast({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [message]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
    >
      <div
        role="alert"
        className="bg-destructive pointer-events-auto max-w-[calc(100%-7rem)] truncate rounded-full px-4 py-2 text-center text-sm font-medium text-white shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
      >
        {message}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const SESSION_KEY = "pf-launch-shown";

/** Solo se reproduce una vez por sesión de pestaña (sessionStorage), no en
 * cada navegación interna — "cuando se abre la app", no "cada vez que
 * cambias de página". motion-safe: hace que quien tenga activado "reducir
 * movimiento" la vea aparecer y desaparecer sin animación, no que no la vea
 * en absoluto (el hueco de tiempo en sí no es "movimiento"). */
export function LaunchAnimation() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, "1");

    // setTimeout(..., 0) en vez de llamar a setVisible directamente: evita el
    // aviso de lint por setState síncrono dentro del cuerpo del efecto.
    const showTimer = setTimeout(() => setVisible(true), 0);
    const exitTimer = setTimeout(() => setExiting(true), 750);
    const removeTimer = setTimeout(() => setVisible(false), 1050);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300",
        exiting && "motion-safe:animate-out motion-safe:fade-out-0 motion-safe:duration-300",
      )}
    >
      <div className="relative flex items-center justify-center">
        <span className="pf-launch-ring bg-primary/50 absolute size-20 rounded-2xl" aria-hidden />
        <img
          src="/icons/icon-192x192.png"
          alt=""
          className="pf-launch-icon shadow-primary/20 relative size-20 rounded-2xl shadow-xl"
        />
      </div>
      <span className="pf-launch-text text-foreground text-lg font-semibold tracking-tight">
        {siteConfig.name}
      </span>
    </div>
  );
}

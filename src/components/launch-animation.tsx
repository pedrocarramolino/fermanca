"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { siteConfig } from "@/config/site";

const SESSION_KEY = "pf-launch-shown";

/** Solo se reproduce una vez por sesión de pestaña (sessionStorage), no en
 * cada navegación interna — "cuando se abre la app", no "cada vez que
 * cambias de página". motion-safe: hace que quien tenga activado "reducir
 * movimiento" la vea aparecer y desaparecer sin animación, no que no la vea
 * en absoluto (el hueco de tiempo en sí no es "movimiento").
 *
 * `visible` arranca en `true` tanto en el servidor como en el primer render
 * del cliente — antes se calculaba mirando `sessionStorage` ya en ese primer
 * render (`typeof window !== "undefined"`), pero eso es justo el patrón que
 * React avisa que rompe la hidratación: el servidor nunca puede ver esa
 * rama, así que el HTML que pinta y lo que React espera al hidratar nunca
 * coincidían, y en cada carga se descartaba y volvía a renderizar medio
 * árbol de la página. Ahora la comprobación de sessionStorage vive en un
 * `useLayoutEffect` (se ejecuta antes de que el navegador pinte, así que
 * sigue sin verse el salto que este componente ya evitaba) — el único coste
 * es que una recarga dura dentro de la misma pestaña, con el splash ya
 * mostrado antes, puede volver a verlo un instante; abrir la PWA de cero
 * siempre empieza con sessionStorage vacío, así que ese caso no cambia. */
export function LaunchAnimation() {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  useLayoutEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");
  }, []);

  useEffect(() => {
    if (!visible) return;
    const exitTimer = setTimeout(() => setExiting(true), 750);
    const removeTimer = setTimeout(() => setVisible(false), 1050);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(removeTimer);
    };
  }, [visible]);

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

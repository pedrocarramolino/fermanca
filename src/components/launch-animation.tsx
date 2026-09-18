"use client";

import {
  createContext,
  startTransition,
  use,
  useEffect,
  useLayoutEffect,
  useState,
  ViewTransition,
  type ReactNode,
} from "react";
import { siteConfig } from "@/config/site";

const SESSION_KEY = "pf-launch-shown";
/** Cuánto se ve el splash antes de empezar a irse. */
const VISIBLE_MS = 750;

/**
 * Nombre del elemento compartido que hace que el icono del splash se
 * convierta en el logo de la cabecera. Solo puede haber UN elemento montado
 * con este nombre a la vez, de ahí todo el tejemaneje del contexto: mientras
 * se ve el splash lo lleva su icono, y la cabecera solo lo toma en el mismo
 * render en que el splash desaparece — que es justo lo que empareja los dos
 * y dibuja el recorrido.
 */
export const APP_LOGO_VT_NAME = "app-logo";

/** `true` cuando el splash ya no está (o nunca llegó a verse). Fuera del
 * proveedor se asume que no hay splash, que es lo correcto para cualquier
 * pantalla suelta. */
const SplashDoneContext = createContext(true);

export function useSplashDone() {
  return use(SplashDoneContext);
}

function Splash() {
  return (
    <div
      aria-hidden
      className="bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3"
    >
      <div className="relative flex items-center justify-center">
        <span className="pf-launch-ring bg-primary/50 absolute size-20 rounded-2xl" aria-hidden />
        <ViewTransition name={APP_LOGO_VT_NAME} share="morph" default="none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192x192.png"
            alt=""
            className="pf-launch-icon shadow-primary/20 relative size-20 rounded-2xl shadow-xl"
          />
        </ViewTransition>
      </div>
      <span className="pf-launch-text text-foreground text-lg font-semibold tracking-tight">
        {siteConfig.name}
      </span>
    </div>
  );
}

/**
 * Solo se reproduce una vez por sesión de pestaña (sessionStorage), no en
 * cada navegación interna — "cuando se abre la app", no "cada vez que
 * cambias de página".
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
 * siempre empieza con sessionStorage vacío, así que ese caso no cambia.
 *
 * El splash se oculta dentro de `startTransition` a propósito: es lo único
 * que activa <ViewTransition>. Con un setState normal desaparecería de golpe,
 * sin recorrido del icono.
 */
export function LaunchProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true);

  useLayoutEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      // Ya se vio en esta pestaña: se quita sin transición, no hay nada que
      // contar al usuario.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(false);
      return;
    }
    sessionStorage.setItem(SESSION_KEY, "1");
  }, []);

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => startTransition(() => setVisible(false)), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <SplashDoneContext value={!visible}>
      {children}
      {visible && (
        <ViewTransition exit="splash-dissolve" default="none">
          <Splash />
        </ViewTransition>
      )}
    </SplashDoneContext>
  );
}

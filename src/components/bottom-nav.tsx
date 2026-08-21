"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Bell, Flame, Home, LineChart, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", key: "home", icon: Home },
  { href: "/statistics", key: "statistics", icon: LineChart },
  { href: "/community", key: "community", icon: Users },
  { href: "/streaks", key: "streaks", icon: Flame },
  { href: "/reminders", key: "reminders", icon: Bell },
] as const;

/** Scroll hacia abajo por encima de esto para que la barra se encoja; por
 * debajo se queda expandida aunque se mueva un poco (evita parpadeos). */
const SCROLL_COMPACT_THRESHOLD = 24;
/** px de movimiento horizontal antes de interpretar el toque como arrastre
 * en vez de un simple tap — evita arrastres accidentales. */
const DRAG_THRESHOLD = 8;
/** Diámetro del círculo resaltado — fijo, no depende del ancho del botón
 * (icono + etiqueta), para que sea siempre un círculo perfecto centrado en
 * el icono y no una píldora que cambia de forma con cada pestaña. */
const HIGHLIGHT_SIZE = 40;

/**
 * Barra de navegación flotante. Con el estilo "Liquid Glass" activado en
 * Ajustes (data-style="glass" en <html>, ver globals.css) es vidrio
 * esmerilado translúcido con un realce especular en el borde superior;
 * si no, un fondo sólido normal — mismas forma y posición en los dos casos.
 * Oculta durante una sesión en marcha (/session/*) para no distraer — igual
 * que Apple Fitness oculta su tab bar durante un entrenamiento activo.
 *
 * Al estilo de la tab bar de iOS 26: se encoge (sin etiquetas) al hacer
 * scroll hacia abajo y se expande de nuevo al subir o al llegar arriba del
 * todo; además se puede arrastrar el dedo/cursor por encima de los iconos
 * para recorrerlos con una pastilla que va deslizándose en vivo — soltar
 * sobre uno navega a esa pestaña. El tap normal (sin arrastre) sigue
 * funcionando como un enlace corriente (clic central, cmd-clic, teclado…).
 */
export function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Nav");
  const [compact, setCompact] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [pillStyle, setPillStyle] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const iconRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dragState = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragging: boolean;
  } | null>(null);
  const suppressNextClick = useRef(false);

  const activeIndex = NAV_ITEMS.findIndex(({ href }) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href),
  );
  const highlightIndex = dragIndex ?? (activeIndex === -1 ? null : activeIndex);

  // Patrón de React para comparar con el render anterior sin efecto (ver
  // "Storing information from previous renders" en la doc de useState):
  // si compact cambia justo en este render, la pastilla salta sin animar
  // en vez de deslizarse Y cambiar de tamaño a la vez — eso es lo que se
  // veía "raro" al navegar a otra pestaña con la barra encogida, porque
  // las dos animaciones (posición y tamaño) se pisaban entre sí.
  const [prevCompact, setPrevCompact] = useState(compact);
  const compactJustChanged = compact !== prevCompact;
  if (compactJustChanged) setPrevCompact(compact);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    function handleScroll() {
      // Throttle por tiempo (no rAF): rAF solo dispara mientras la pestaña
      // esté pintando fotogramas, y de paso ata el ritmo del efecto a la
      // tasa de refresco de la pantalla en vez de a la del scroll en sí.
      if (ticking) return;
      ticking = true;
      setTimeout(() => {
        const y = window.scrollY;
        if (y <= SCROLL_COMPACT_THRESHOLD) setCompact(false);
        else if (y > lastY) setCompact(true);
        else if (y < lastY) setCompact(false);
        lastY = y;
        ticking = false;
      }, 100);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Refs no se leen durante el render (regla de React) — la posición del
  // círculo se recalcula aquí, después de que el DOM ya refleje el índice
  // resaltado. Se centra sobre el ICONO (no sobre todo el botón, que
  // también incluye la etiqueta) usando getBoundingClientRect en vez de
  // offsetLeft/Top para no depender de qué elemento sea su offsetParent.
  // Se vigila el CONTENEDOR entero, no solo el elemento resaltado: si un
  // vecino cambia de tamaño (p. ej. al pasar de compacto a expandido) el
  // resaltado se desplaza aunque su propio ancho no cambie, y un
  // ResizeObserver solo en él no se entera — se queda pegado a la posición
  // de otra pestaña.
  useLayoutEffect(() => {
    if (highlightIndex === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPillStyle(null);
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      const iconEl = iconRefs.current[highlightIndex];
      if (!iconEl) return;
      const iconRect = iconEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const centerX = iconRect.left + iconRect.width / 2 - containerRect.left;
      const centerY = iconRect.top + iconRect.height / 2 - containerRect.top;
      setPillStyle({ left: centerX - HIGHLIGHT_SIZE / 2, top: centerY - HIGHLIGHT_SIZE / 2 });
    };
    update();
    // Repasos tras el primer pintado: en la carga inicial (fuentes
    // cargando, hidratación asentándose, aparición/desaparición de la
    // barra de scroll) la primera medición puede quedar unos píxeles
    // corrida sin que cambie el tamaño del propio contenedor — esto lo
    // corrige sin esperar a que el usuario interactúe.
    const timeouts = [100, 400, 1000].map((ms) => setTimeout(update, ms));
    window.addEventListener("resize", update);

    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(document.body);
    return () => {
      timeouts.forEach(clearTimeout);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [highlightIndex]);

  if (pathname.startsWith("/session/")) return null;

  function itemIndexAt(clientX: number): number | null {
    for (let i = 0; i < NAV_ITEMS.length; i++) {
      const rect = itemRefs.current[i]?.getBoundingClientRect();
      if (rect && clientX >= rect.left && clientX <= rect.right) return i;
    }
    return null;
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const state = dragState.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!state.dragging) {
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      if (Math.abs(dx) < DRAG_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
      state.dragging = true;
      suppressNextClick.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const index = itemIndexAt(event.clientX);
    if (index !== null) setDragIndex(index);
  }

  function endDrag(event: ReactPointerEvent<HTMLDivElement>, shouldNavigate: boolean) {
    const state = dragState.current;
    dragState.current = null;
    if (!state?.dragging) {
      setDragIndex(null);
      return;
    }
    const index = itemIndexAt(event.clientX) ?? dragIndex;
    setDragIndex(null);
    const target = index !== null ? NAV_ITEMS[index] : undefined;
    if (shouldNavigate && target) router.push(target.href);
  }

  return (
    <nav
      className="fixed inset-x-0 z-40 flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 1rem)" }}
    >
      <div
        ref={containerRef}
        className={cn(
          "relative flex touch-pan-y items-center gap-1 rounded-[28px] transition-[padding] duration-300 ease-out",
          compact ? "p-1" : "p-1.5",
          "bg-background ring-border ring-1 shadow-sm",
          "glass:bg-[color-mix(in_oklch,var(--background)_var(--glass-alpha-light,70%),transparent)] glass:dark:bg-[color-mix(in_oklch,var(--background)_var(--glass-alpha-dark,50%),transparent)]",
          "glass:ring-border/60 glass:shadow-[0_8px_32px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.35)]",
          "glass:[backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)_url(#liquid-glass-distortion)] glass:[-webkit-backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)] glass:dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => endDrag(event, true)}
        onPointerCancel={(event) => endDrag(event, false)}
      >
        {pillStyle && (
          <div
            aria-hidden
            className={cn(
              "bg-muted pointer-events-none absolute top-0 left-0 rounded-full",
              !compactJustChanged && "transition-transform duration-200 ease-out",
            )}
            style={{
              width: HIGHLIGHT_SIZE,
              height: HIGHLIGHT_SIZE,
              transform: `translate(${pillStyle.left}px, ${pillStyle.top}px)`,
            }}
          />
        )}
        {NAV_ITEMS.map(({ href, key, icon: Icon }, index) => {
          const active = index === activeIndex;
          const previewed = dragIndex === index;
          const label = t(key);
          return (
            <Link
              key={href}
              ref={(el) => {
                itemRefs.current[index] = el;
              }}
              href={href}
              aria-label={label}
              aria-current={active ? "page" : undefined}
              onClick={(event) => {
                if (suppressNextClick.current) {
                  event.preventDefault();
                  suppressNextClick.current = false;
                }
              }}
              className={cn(
                "relative z-10 flex min-w-15 flex-col items-center gap-0.5 rounded-3xl px-3 py-2 transition-colors",
                active || previewed
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                ref={(el) => {
                  iconRefs.current[index] = el;
                }}
                className="flex items-center justify-center"
              >
                <Icon
                  className={cn(
                    "size-5 transition-transform duration-150",
                    previewed && "scale-110",
                  )}
                  strokeWidth={active ? 2.4 : 2}
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.15 : 0}
                />
              </span>
              <span
                className={cn(
                  "overflow-hidden text-[10px] leading-none font-medium whitespace-nowrap transition-[max-width,opacity] duration-200",
                  compact ? "max-w-0 opacity-0" : "max-w-16 opacity-100",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ThemePreference } from "@/core/domain/user-settings";

const STORAGE_KEY = "theme";

interface ThemeContextValue {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveIsDark(theme: ThemePreference): boolean {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(theme: ThemePreference) {
  const isDark = resolveIsDark(theme);
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

/**
 * Sustituye a next-themes: esa librería inyecta su propio `<script>` como
 * elemento de React (no como HTML estático del servidor) para evitar el
 * flash de tema incorrecto, y eso es justo lo que provocaba el error de
 * hidratación en consola en cada carga — React 19 no hidrata bien un
 * `<script>` renderizado así dentro de un componente cliente. La misma
 * protección contra el flash vive ahora en `layout.tsx`, como HTML estático
 * del Server Component (fuera del árbol que hidrata este provider).
 */
export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: React.ReactNode;
  defaultTheme: ThemePreference;
}) {
  // El script inline de layout.tsx ya aplicó la clase correcta antes del
  // primer pintado leyendo directamente localStorage — este estado inicial
  // solo tiene que coincidir con eso (puede diferir de `defaultTheme`, que
  // viene del servidor, si el usuario cambió el tema en otra pestaña/sesión).
  // `settings-form.tsx` ya protege su render frente al desajuste
  // servidor/cliente que esto puede causar con su propia bandera `mounted`.
  const [theme, setThemeState] = useState<ThemePreference>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return (localStorage.getItem(STORAGE_KEY) as ThemePreference | null) ?? defaultTheme;
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(theme);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    setThemeState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage puede no estar disponible (modo privado) — el tema
      // sigue funcionando en esta sesión, solo no persiste entre visitas.
    }
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}

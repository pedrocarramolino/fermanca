/**
 * Matices sobre la misma fórmula OKLCH ya usada para el teal por defecto en
 * globals.css (L=0.52/C=0.11 en claro, L=0.75/C=0.13 en oscuro) — solo cambia
 * H. Al no tocar L/C, el contraste texto/fondo ya validado para el acento
 * por defecto se mantiene igual para cualquier preset, sin tener que validar
 * cada uno por separado.
 */
export type AccentPreset = "teal" | "blue" | "violet" | "rose" | "amber" | "green";

export const ACCENT_PRESETS: Record<AccentPreset, { label: string; hue: number; swatch: string }> =
  {
    teal: { label: "Verde azulado", hue: 185, swatch: "oklch(0.6 0.14 185)" },
    blue: { label: "Azul", hue: 250, swatch: "oklch(0.6 0.16 250)" },
    violet: { label: "Violeta", hue: 300, swatch: "oklch(0.58 0.18 300)" },
    rose: { label: "Rosa", hue: 15, swatch: "oklch(0.62 0.19 15)" },
    amber: { label: "Ámbar", hue: 70, swatch: "oklch(0.75 0.15 70)" },
    green: { label: "Verde", hue: 145, swatch: "oklch(0.65 0.15 145)" },
  };

export function isAccentPreset(value: string | null): value is AccentPreset {
  return value !== null && Object.hasOwn(ACCENT_PRESETS, value);
}

export function accentOverrideCss(preset: AccentPreset): string {
  const { hue } = ACCENT_PRESETS[preset];
  const light = `--primary:oklch(0.52 0.11 ${hue});--primary-foreground:oklch(0.99 0 0);--ring:oklch(0.52 0.11 ${hue});--accent:oklch(0.96 0.02 ${hue});--accent-foreground:oklch(0.24 0.05 ${hue});--sidebar-primary:oklch(0.52 0.11 ${hue});--sidebar-ring:oklch(0.52 0.11 ${hue});--sidebar-accent:oklch(0.96 0.02 ${hue});--sidebar-accent-foreground:oklch(0.24 0.05 ${hue})`;
  const dark = `--primary:oklch(0.75 0.13 ${hue});--primary-foreground:oklch(0.16 0.03 ${hue});--ring:oklch(0.75 0.13 ${hue});--accent:oklch(0.28 0.04 ${hue});--accent-foreground:oklch(0.93 0.03 ${hue});--sidebar-primary:oklch(0.75 0.13 ${hue});--sidebar-ring:oklch(0.75 0.13 ${hue});--sidebar-accent:oklch(0.28 0.04 ${hue});--sidebar-accent-foreground:oklch(0.93 0.03 ${hue})`;
  return `:root{${light}}.dark{${dark}}`;
}

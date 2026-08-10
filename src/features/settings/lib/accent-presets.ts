/**
 * Matices sobre la misma fórmula OKLCH ya usada para el teal por defecto en
 * globals.css (L=0.52/C=0.11 en claro, L=0.75/C=0.13 en oscuro) — solo cambia
 * H. Al no tocar L/C, el contraste texto/fondo ya validado para el acento
 * por defecto se mantiene igual para cualquier preset, sin tener que validar
 * cada uno por separado.
 */
export type AccentPreset =
  | "teal"
  | "blue"
  | "violet"
  | "rose"
  | "amber"
  | "green"
  | "indigo"
  | "magenta"
  | "orange"
  | "lime"
  | "cyan";

export const ACCENT_PRESETS: Record<AccentPreset, { label: string; hue: number; swatch: string }> =
  {
    teal: { label: "Verde azulado", hue: 185, swatch: "oklch(0.6 0.14 185)" },
    blue: { label: "Azul", hue: 250, swatch: "oklch(0.6 0.16 250)" },
    violet: { label: "Violeta", hue: 300, swatch: "oklch(0.58 0.18 300)" },
    rose: { label: "Rosa", hue: 15, swatch: "oklch(0.62 0.19 15)" },
    amber: { label: "Ámbar", hue: 70, swatch: "oklch(0.75 0.15 70)" },
    green: { label: "Verde", hue: 145, swatch: "oklch(0.65 0.15 145)" },
    indigo: { label: "Índigo", hue: 275, swatch: "oklch(0.58 0.17 275)" },
    magenta: { label: "Magenta", hue: 330, swatch: "oklch(0.6 0.19 330)" },
    orange: { label: "Naranja", hue: 45, swatch: "oklch(0.68 0.17 45)" },
    lime: { label: "Lima", hue: 115, swatch: "oklch(0.72 0.16 115)" },
    cyan: { label: "Cian", hue: 210, swatch: "oklch(0.65 0.13 210)" },
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

/** Contraste WCAG por umbral simple (no busca la ratio exacta, solo decide
 * blanco vs. negro) — de sobra para elegir el texto sobre un color que ha
 * elegido el usuario, sin tener que reinterpretarlo en OKLCH. */
function foregroundForHex(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const linearize = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
  return luminance < 0.5 ? "oklch(0.99 0 0)" : "oklch(0.16 0 0)";
}

/**
 * Igual que accentOverrideCss pero para un color elegido libremente (no
 * viene de la paleta curada, así que no hay un solo matiz H del que derivar
 * el resto): se usa el color tal cual para primary/ring, y color-mix()
 * (misma técnica que ya usa el hover de "secondary" en button.tsx) para los
 * tintes de accent en vez del truco de "mismo H, L/C fijos" de los presets.
 */
export function accentOverrideCssFromHex(hex: string): string {
  const foreground = foregroundForHex(hex);
  const light = `--primary:${hex};--primary-foreground:${foreground};--ring:${hex};--accent:color-mix(in oklch, ${hex}, white 90%);--accent-foreground:color-mix(in oklch, ${hex}, black 70%);--sidebar-primary:${hex};--sidebar-ring:${hex};--sidebar-accent:color-mix(in oklch, ${hex}, white 90%);--sidebar-accent-foreground:color-mix(in oklch, ${hex}, black 70%)`;
  const dark = `--primary:${hex};--primary-foreground:${foreground};--ring:${hex};--accent:color-mix(in oklch, ${hex}, black 85%);--accent-foreground:color-mix(in oklch, ${hex}, white 75%);--sidebar-primary:${hex};--sidebar-ring:${hex};--sidebar-accent:color-mix(in oklch, ${hex}, black 85%);--sidebar-accent-foreground:color-mix(in oklch, ${hex}, white 75%)`;
  return `:root{${light}}.dark{${dark}}`;
}

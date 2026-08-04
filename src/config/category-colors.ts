/**
 * Paleta acotada para categorías personalizadas: evita un selector de color
 * libre (RGB/hex) a cambio de una elección rápida y siempre accesible como
 * puntos/barras/segmentos de gráfico. Son los mismos 8 tonos que
 * --category-* en globals.css, en el mismo orden — ese orden concreto es el
 * que pasa la validación de accesibilidad (separación CVD por pares
 * adyacentes) de la skill dataviz; no añadir colores sueltos ni reordenar
 * sin volver a validar con validate_palette.js (rojo y verde son el par más
 * delicado: adyacentes entre sí caen a ΔE 0.8 en deuteranopia).
 */
export const CUSTOM_CATEGORY_COLORS = [
  { label: "Ámbar", value: "oklch(0.7 0.16 55)" },
  { label: "Azul", value: "oklch(0.6 0.16 230)" },
  { label: "Verde", value: "oklch(0.62 0.15 135)" },
  { label: "Violeta", value: "oklch(0.55 0.2 300)" },
  { label: "Magenta", value: "oklch(0.6 0.2 350)" },
  { label: "Verde azulado", value: "oklch(0.65 0.14 165)" },
  { label: "Índigo", value: "oklch(0.5 0.18 260)" },
  { label: "Rojo", value: "oklch(0.6 0.19 25)" },
] as const;

export const DEFAULT_CUSTOM_CATEGORY_COLOR = CUSTOM_CATEGORY_COLORS[0].value;

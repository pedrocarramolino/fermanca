/**
 * Paleta acotada para categorías personalizadas: evita un selector de color
 * libre (RGB/hex) a cambio de una elección rápida y siempre accesible como
 * puntos/barras/segmentos de gráfico. Los primeros 8 tonos son los mismos
 * --category-* de globals.css, en el mismo orden; los 4 últimos (Oliva,
 * Púrpura, Cian, Rosa) se añadieron después para tener más variedad. El
 * orden concreto (completo, no solo los primeros 8) es el que pasa la
 * validación de accesibilidad de la skill dataviz — separación CVD por
 * pares ADYACENTES, no todos-contra-todos, que con más de 3-4 colores
 * simultáneos ninguna paleta categórica pasa — con el mismo margen que ya
 * tenía la paleta original (peor par ΔE 6.3, banda "floor", legal porque el
 * nombre de la categoría siempre acompaña al color como texto). No añadir
 * colores sueltos ni reordenar sin volver a validar con
 * validate_palette.js.
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
  { label: "Oliva", value: "oklch(0.68 0.15 95)" },
  { label: "Púrpura", value: "oklch(0.55 0.19 280)" },
  { label: "Cian", value: "oklch(0.65 0.13 195)" },
  { label: "Rosa", value: "oklch(0.62 0.18 325)" },
] as const;

export const DEFAULT_CUSTOM_CATEGORY_COLOR = CUSTOM_CATEGORY_COLORS[0].value;

import { formatDurationShort } from "@/core/domain/duration";

const WIDTH = 1080;
const HEIGHT = 1920;
const MAX_VISIBLE_BLOCKS = 8;

// El panel interior es blanco fijo a propósito, no --card del tema: la
// imagen la va a ver gente que nunca ha abierto la app, así que tiene que
// leerse bien pase lo que pase (si el que comparte está en modo oscuro, un
// panel oscuro-sobre-degradado-oscuro perdería todo el contraste). Solo el
// fondo sigue el acento elegido en Ajustes.
const PANEL_BG = "#fcfcfb";
const PANEL_TEXT = "#111111";
const PANEL_MUTED = "#6b7280";
const PANEL_DIVIDER = "#e5e7eb";

const ICON_SIZE = 108;
const ICON_TO_WORDMARK_GAP = 44;
const WORDMARK_LINE = 44;
const WORDMARK_TO_PANEL_GAP = 90;
const PANEL_X = 84;
const PANEL_WIDTH = WIDTH - PANEL_X * 2;
const PANEL_PADDING_X = 64;
const PANEL_PADDING_TOP = 72;
const PANEL_PADDING_BOTTOM = 56;
const TOTAL_TIME_HEIGHT = 132;
const SUBTITLE_HEIGHT = 66;
const DIVIDER_GAP = 48;
const ROW_HEIGHT = 92;
const ROW_GAP = 18;
const EXTRA_LINE_HEIGHT = 56;
const PANEL_TO_BADGE_GAP = 56;
const BADGE_HEIGHT = 88;
const TO_CREDIT_GAP = 48;
const CREDIT_LINE_HEIGHT = 40;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

async function loadIcon(): Promise<HTMLImageElement | null> {
  try {
    const img = new Image();
    img.src = "/icons/icon-192x192.png";
    await img.decode();
    return img;
  } catch {
    return null;
  }
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
}

function panelHeightFor(visibleCount: number, hasExtra: boolean): number {
  const rowsHeight = visibleCount > 0 ? visibleCount * ROW_HEIGHT + (visibleCount - 1) * ROW_GAP : 0;
  return (
    PANEL_PADDING_TOP +
    TOTAL_TIME_HEIGHT +
    SUBTITLE_HEIGHT +
    DIVIDER_GAP +
    rowsHeight +
    (hasExtra ? EXTRA_LINE_HEIGHT : 0) +
    PANEL_PADDING_BOTTOM
  );
}

/**
 * Tarjeta 1080×1920 (proporción de Historia de Instagram): un panel blanco
 * flotante con el resumen, centrado verticalmente sobre un degradado del
 * acento elegido en Ajustes — mismo lenguaje visual que las Card
 * del resto de la app, en vez de texto suelto sobre el color. Se adjunta
 * como imagen al compartir; un enlace de texto no sirve de nada en una
 * Historia de Instagram.
 */
export async function generateSessionShareCardBlob(input: {
  totalSeconds: number;
  blockCount: number;
  blocks: { name: string; color: string; actualDurationSeconds: number }[];
  streakDays: number;
}): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const primary = cssVar("--primary") || "#0d9488";
  const onPrimary = cssVar("--primary-foreground") || "#ffffff";

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, `color-mix(in oklch, ${primary} 55%, white)`);
  background.addColorStop(0.5, primary);
  background.addColorStop(1, `color-mix(in oklch, ${primary} 45%, black)`);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // ── Calcular todo el layout ANTES de dibujar, para poder centrarlo ──────
  const visibleBlocks = input.blocks.slice(0, MAX_VISIBLE_BLOCKS);
  const extraCount = input.blocks.length - visibleBlocks.length;
  const hasStreak = input.streakDays > 1;
  const panelHeight = panelHeightFor(visibleBlocks.length, extraCount > 0);

  const contentHeight =
    ICON_SIZE +
    ICON_TO_WORDMARK_GAP +
    WORDMARK_LINE +
    WORDMARK_TO_PANEL_GAP +
    panelHeight +
    (hasStreak ? PANEL_TO_BADGE_GAP + BADGE_HEIGHT : 0) +
    TO_CREDIT_GAP +
    CREDIT_LINE_HEIGHT;
  const contentTop = Math.max(80, Math.round((HEIGHT - contentHeight) / 2));

  const iconTop = contentTop;
  const wordmarkBaseline = iconTop + ICON_SIZE + ICON_TO_WORDMARK_GAP + WORDMARK_LINE * 0.72;
  const panelTop = iconTop + ICON_SIZE + ICON_TO_WORDMARK_GAP + WORDMARK_LINE + WORDMARK_TO_PANEL_GAP;
  const badgeTop = panelTop + panelHeight + PANEL_TO_BADGE_GAP;
  const creditTop = (hasStreak ? badgeTop + BADGE_HEIGHT : panelTop + panelHeight) + TO_CREDIT_GAP;

  // ── Cabecera: icono + nombre, directamente sobre el degradado ──────────
  ctx.textAlign = "center";
  ctx.fillStyle = onPrimary;

  const icon = await loadIcon();
  if (icon) {
    roundRectPath(ctx, WIDTH / 2 - ICON_SIZE / 2, iconTop, ICON_SIZE, ICON_SIZE, 26);
    ctx.save();
    ctx.clip();
    ctx.drawImage(icon, WIDTH / 2 - ICON_SIZE / 2, iconTop, ICON_SIZE, ICON_SIZE);
    ctx.restore();
  }
  ctx.font = "600 40px system-ui, sans-serif";
  ctx.fillText("PracticeFlow", WIDTH / 2, wordmarkBaseline);

  // ── Panel flotante ────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = PANEL_BG;
  roundRectPath(ctx, PANEL_X, panelTop, PANEL_WIDTH, panelHeight, 40);
  ctx.fill();
  ctx.restore();

  let y = panelTop + PANEL_PADDING_TOP;

  ctx.textAlign = "center";
  ctx.fillStyle = PANEL_TEXT;
  ctx.font = "700 132px system-ui, sans-serif";
  ctx.fillText(formatDurationShort(input.totalSeconds), WIDTH / 2, y + 100);
  y += TOTAL_TIME_HEIGHT;

  ctx.fillStyle = PANEL_MUTED;
  ctx.font = "500 42px system-ui, sans-serif";
  ctx.fillText(
    `en ${input.blockCount} ${input.blockCount === 1 ? "bloque" : "bloques"}`,
    WIDTH / 2,
    y + 46,
  );
  y += SUBTITLE_HEIGHT;

  ctx.strokeStyle = PANEL_DIVIDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + PANEL_PADDING_X, y + 24);
  ctx.lineTo(PANEL_X + PANEL_WIDTH - PANEL_PADDING_X, y + 24);
  ctx.stroke();
  y += DIVIDER_GAP;

  const rowX = PANEL_X + PANEL_PADDING_X;
  const rowWidth = PANEL_WIDTH - PANEL_PADDING_X * 2;

  for (const block of visibleBlocks) {
    const rowCenterY = y + ROW_HEIGHT / 2;

    ctx.fillStyle = block.color;
    ctx.beginPath();
    ctx.arc(rowX + 16, rowCenterY, 15, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = "left";
    ctx.fillStyle = PANEL_TEXT;
    ctx.font = "500 38px system-ui, sans-serif";
    const maxNameWidth = rowWidth - 260;
    ctx.fillText(truncateToWidth(ctx, block.name, maxNameWidth), rowX + 52, rowCenterY + 13);

    ctx.textAlign = "right";
    ctx.fillStyle = PANEL_MUTED;
    ctx.font = "500 38px system-ui, sans-serif";
    ctx.fillText(
      formatDurationShort(block.actualDurationSeconds),
      rowX + rowWidth,
      rowCenterY + 13,
    );

    y += ROW_HEIGHT + ROW_GAP;
  }

  if (extraCount > 0) {
    ctx.textAlign = "center";
    ctx.fillStyle = PANEL_MUTED;
    ctx.font = "500 34px system-ui, sans-serif";
    ctx.fillText(`+${extraCount} más`, WIDTH / 2, y + 40);
  }

  // ── Racha: insignia sobre el degradado, debajo del panel ────────────────
  if (hasStreak) {
    const badgeText = `🔥 RACHA DE ${input.streakDays} DÍAS`;
    ctx.font = "600 38px system-ui, sans-serif";
    const badgePaddingX = 36;
    const badgeWidth = ctx.measureText(badgeText).width + badgePaddingX * 2;

    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    roundRectPath(ctx, WIDTH / 2 - badgeWidth / 2, badgeTop, badgeWidth, BADGE_HEIGHT, BADGE_HEIGHT / 2);
    ctx.fill();

    ctx.textAlign = "center";
    ctx.fillStyle = onPrimary;
    ctx.fillText(badgeText, WIDTH / 2, badgeTop + BADGE_HEIGHT / 2 + 13);
  }

  // ── Crédito: justo debajo del panel (o de la insignia de racha, si la
  // hay) — parte del bloque centrado, no fijo al canvas, para que se mueva
  // con el resto del contenido en vez de quedar suelto abajo del todo. ────
  ctx.textAlign = "center";
  ctx.fillStyle = `color-mix(in oklch, ${onPrimary} 65%, transparent)`;
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText(
    `© ${new Date().getFullYear()} Pedro Carramolino · Idea original: Alejandro Mas`,
    WIDTH / 2,
    creditTop + 28,
  );

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

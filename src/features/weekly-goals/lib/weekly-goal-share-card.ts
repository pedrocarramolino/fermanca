import { formatDurationShort } from "@/core/domain/duration";

const WIDTH = 1080;
const HEIGHT = 1920;

// Mismo motivo que en session-share-card.ts: el panel es blanco fijo (no
// --card del tema) porque lo ve gente que nunca ha abierto la app — solo el
// fondo sigue el acento elegido en Ajustes.
const PANEL_BG = "#fcfcfb";
const PANEL_TEXT = "#111111";
const PANEL_MUTED = "#6b7280";
const PANEL_DIVIDER = "#e5e7eb";
const DOT_EMPTY = "#e5e7eb";

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
const DAYS_LABEL_HEIGHT = 46;
const DAYS_LABEL_TO_DOTS_GAP = 30;
const DOTS_ROW_HEIGHT = 32;
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

function panelHeight(): number {
  return (
    PANEL_PADDING_TOP +
    TOTAL_TIME_HEIGHT +
    SUBTITLE_HEIGHT +
    DIVIDER_GAP +
    DAYS_LABEL_HEIGHT +
    DAYS_LABEL_TO_DOTS_GAP +
    DOTS_ROW_HEIGHT +
    PANEL_PADDING_BOTTOM
  );
}

/**
 * Tarjeta 1080×1920 para el objetivo semanal cumplido — mismo lenguaje
 * visual que generateSessionShareCardBlob (panel blanco flotante sobre un
 * degradado del acento elegido en Ajustes), pero con el tiempo total y los
 * días conseguidos en vez de un listado de bloques, que aquí no aplica.
 */
export async function generateWeeklyGoalShareCardBlob(input: {
  targetDays: number;
  targetSeconds: number;
  practicedDays: number;
  practicedSeconds: number;
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
  const hasStreak = input.streakDays > 1;
  const height = panelHeight();

  const contentHeight =
    ICON_SIZE +
    ICON_TO_WORDMARK_GAP +
    WORDMARK_LINE +
    WORDMARK_TO_PANEL_GAP +
    height +
    TO_CREDIT_GAP +
    CREDIT_LINE_HEIGHT +
    (hasStreak ? PANEL_TO_BADGE_GAP + BADGE_HEIGHT : 0);
  const contentTop = Math.max(80, Math.round((HEIGHT - contentHeight) / 2));

  const iconTop = contentTop;
  const wordmarkBaseline = iconTop + ICON_SIZE + ICON_TO_WORDMARK_GAP + WORDMARK_LINE * 0.72;
  const panelTop = iconTop + ICON_SIZE + ICON_TO_WORDMARK_GAP + WORDMARK_LINE + WORDMARK_TO_PANEL_GAP;
  const creditTop = panelTop + height + TO_CREDIT_GAP;
  const badgeTop = creditTop + CREDIT_LINE_HEIGHT + PANEL_TO_BADGE_GAP;

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
  ctx.fillText("Fermança", WIDTH / 2, wordmarkBaseline);

  // ── Panel flotante ────────────────────────────────────────────────────
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.28)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  ctx.fillStyle = PANEL_BG;
  roundRectPath(ctx, PANEL_X, panelTop, PANEL_WIDTH, height, 40);
  ctx.fill();
  ctx.restore();

  let y = panelTop + PANEL_PADDING_TOP;

  ctx.textAlign = "center";
  ctx.fillStyle = PANEL_TEXT;
  ctx.font = "700 132px system-ui, sans-serif";
  ctx.fillText(formatDurationShort(input.practicedSeconds), WIDTH / 2, y + 100);
  y += TOTAL_TIME_HEIGHT;

  ctx.fillStyle = PANEL_MUTED;
  ctx.font = "500 42px system-ui, sans-serif";
  ctx.fillText("🎯 objetivo semanal cumplido", WIDTH / 2, y + 46);
  y += SUBTITLE_HEIGHT;

  ctx.strokeStyle = PANEL_DIVIDER;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(PANEL_X + PANEL_PADDING_X, y + 24);
  ctx.lineTo(PANEL_X + PANEL_WIDTH - PANEL_PADDING_X, y + 24);
  ctx.stroke();
  y += DIVIDER_GAP;

  ctx.textAlign = "center";
  ctx.fillStyle = PANEL_TEXT;
  ctx.font = "500 38px system-ui, sans-serif";
  ctx.fillText(`${input.practicedDays} / ${input.targetDays} días`, WIDTH / 2, y + 34);
  y += DAYS_LABEL_HEIGHT + DAYS_LABEL_TO_DOTS_GAP;

  const dotRadius = 16;
  const dotGap = 22;
  const dotsWidth = input.targetDays * dotRadius * 2 + (input.targetDays - 1) * dotGap;
  let dotX = WIDTH / 2 - dotsWidth / 2 + dotRadius;
  const dotY = y + DOTS_ROW_HEIGHT / 2;
  for (let i = 0; i < input.targetDays; i++) {
    ctx.fillStyle = i < input.practicedDays ? primary : DOT_EMPTY;
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();
    dotX += dotRadius * 2 + dotGap;
  }

  // ── Crédito: justo debajo del panel — parte del bloque centrado, no fijo
  // al canvas, para que se mueva con el resto del contenido. ─────────────
  ctx.textAlign = "center";
  ctx.fillStyle = `color-mix(in oklch, ${onPrimary} 65%, transparent)`;
  ctx.font = "500 28px system-ui, sans-serif";
  ctx.fillText(
    `© ${new Date().getFullYear()} Pedro Carramolino · Idea original: Alejandro Mas`,
    WIDTH / 2,
    creditTop + 28,
  );

  // ── Racha: insignia sobre el degradado, debajo del crédito ─────────────
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

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

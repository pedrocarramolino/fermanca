import { formatDurationShort } from "@/core/domain/duration";
import { resolveDrawRect, type StoryTransform } from "@/features/session-timer/lib/story-transform";

const WIDTH = 1080;
const HEIGHT = 1920;
const MAX_VISIBLE_BLOCKS = 5;

export type StoryStyleVariant = "classic" | "minimal" | "bold";

// Colores fijos, no leídos de --primary/--foreground del tema: esta imagen
// la va a ver gente en Instagram que nunca ha abierto la app, y no debe
// cambiar de aspecto según si quien la comparte tenía el modo claro/oscuro
// activado en ese momento (a diferencia de session-share-card.ts).
const TEXT_ON_PHOTO = "#ffffff";
const MUTED_ON_PHOTO = "rgba(255, 255, 255, 0.78)";
const CREDIT_ON_PHOTO = "rgba(255, 255, 255, 0.55)";
const DARK_PANEL_BG = "rgba(12, 12, 14, 0.55)";

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

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return `${truncated}…`;
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

function drawCategoryRow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  block: { name: string; color: string; actualDurationSeconds: number },
) {
  ctx.fillStyle = block.color;
  ctx.beginPath();
  ctx.arc(x + 14, y, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = "left";
  ctx.fillStyle = TEXT_ON_PHOTO;
  ctx.font = "500 34px system-ui, sans-serif";
  ctx.fillText(truncateToWidth(ctx, block.name, width - 220), x + 44, y + 12);

  ctx.textAlign = "right";
  ctx.fillStyle = MUTED_ON_PHOTO;
  ctx.font = "500 34px system-ui, sans-serif";
  ctx.fillText(formatDurationShort(block.actualDurationSeconds), x + width, y + 12);
}

interface StoryCardInput {
  photoImage: HTMLImageElement;
  transform: StoryTransform;
  styleVariant: StoryStyleVariant;
  totalSeconds: number;
  blockCount: number;
  blocks: { name: string; color: string; actualDurationSeconds: number }[];
  streakDays: number;
  sessionName: string | null;
  date: Date;
  /** Para formatear la fecha en el idioma del usuario — "es" por defecto. */
  locale?: string;
}

function formatStoryDate(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(
      date,
    );
  } catch {
    return date.toLocaleDateString();
  }
}

function drawStreakBadge(ctx: CanvasRenderingContext2D, centerX: number, bottomY: number, days: number) {
  const text = `🔥 ${days} DÍAS`;
  ctx.font = "600 32px system-ui, sans-serif";
  const paddingX = 30;
  const badgeWidth = ctx.measureText(text).width + paddingX * 2;
  const badgeHeight = 72;

  ctx.fillStyle = "rgba(255, 255, 255, 0.16)";
  roundRectPath(ctx, centerX - badgeWidth / 2, bottomY - badgeHeight, badgeWidth, badgeHeight, badgeHeight / 2);
  ctx.fill();

  ctx.textAlign = "center";
  ctx.fillStyle = TEXT_ON_PHOTO;
  ctx.fillText(text, centerX, bottomY - badgeHeight / 2 + 11);
}

function drawCredit(ctx: CanvasRenderingContext2D, centerX: number, y: number, icon: HTMLImageElement | null) {
  const iconSize = 32;
  const label = "PracticeFlow";
  ctx.font = "600 30px system-ui, sans-serif";
  const labelWidth = ctx.measureText(label).width;
  const gap = 12;
  const totalWidth = icon ? iconSize + gap + labelWidth : labelWidth;
  let x = centerX - totalWidth / 2;

  if (icon) {
    roundRectPath(ctx, x, y - iconSize / 2, iconSize, iconSize, 8);
    ctx.save();
    ctx.clip();
    ctx.drawImage(icon, x, y - iconSize / 2, iconSize, iconSize);
    ctx.restore();
    x += iconSize + gap;
  }

  ctx.textAlign = "left";
  ctx.fillStyle = CREDIT_ON_PHOTO;
  ctx.fillText(label, x, y + 10);
}

function drawClassicLayout(
  ctx: CanvasRenderingContext2D,
  input: StoryCardInput,
  visibleBlocks: { name: string; color: string; actualDurationSeconds: number }[],
  extraCount: number,
  icon: HTMLImageElement | null,
) {
  const scrim = ctx.createLinearGradient(0, HEIGHT * 0.55, 0, HEIGHT);
  scrim.addColorStop(0, "rgba(0, 0, 0, 0)");
  scrim.addColorStop(1, "rgba(0, 0, 0, 0.82)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const marginX = 84;
  let y = HEIGHT - 96;

  drawCredit(ctx, WIDTH / 2, y, icon);
  y -= 56;

  ctx.textAlign = "left";
  ctx.fillStyle = MUTED_ON_PHOTO;
  ctx.font = "500 32px system-ui, sans-serif";
  const dateAndStreak =
    input.streakDays > 1
      ? `${formatStoryDate(input.date, input.locale ?? "es")} · 🔥 ${input.streakDays} días`
      : formatStoryDate(input.date, input.locale ?? "es");
  ctx.fillText(dateAndStreak, marginX, y);
  y -= 64;

  const rowsHeight = visibleBlocks.length * 66 + (extraCount > 0 ? 44 : 0);
  y -= rowsHeight;
  const rowsTop = y;
  let rowY = rowsTop;
  for (const block of visibleBlocks) {
    drawCategoryRow(ctx, marginX, rowY, WIDTH - marginX * 2, block);
    rowY += 66;
  }
  if (extraCount > 0) {
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED_ON_PHOTO;
    ctx.font = "500 30px system-ui, sans-serif";
    ctx.fillText(`+${extraCount} más`, marginX, rowY + 6);
  }
  y -= 56;

  if (input.blockCount > 0) {
    ctx.textAlign = "left";
    ctx.fillStyle = MUTED_ON_PHOTO;
    ctx.font = "500 38px system-ui, sans-serif";
    ctx.fillText(
      `en ${input.blockCount} ${input.blockCount === 1 ? "bloque" : "bloques"}`,
      marginX,
      y,
    );
  }
  y -= 150;

  ctx.textAlign = "left";
  ctx.fillStyle = TEXT_ON_PHOTO;
  ctx.font = "700 140px system-ui, sans-serif";
  ctx.fillText(formatDurationShort(input.totalSeconds), marginX, y);

  if (input.sessionName) {
    y -= 150;
    ctx.font = "600 42px system-ui, sans-serif";
    ctx.fillStyle = MUTED_ON_PHOTO;
    ctx.fillText(truncateToWidth(ctx, input.sessionName, WIDTH - marginX * 2), marginX, y);
  }
}

function drawMinimalLayout(
  ctx: CanvasRenderingContext2D,
  input: StoryCardInput,
  icon: HTMLImageElement | null,
) {
  const centerX = WIDTH / 2;
  const pillBottom = HEIGHT - 220;
  const pillHeight = 190;

  ctx.font = "700 104px system-ui, sans-serif";
  const timeText = formatDurationShort(input.totalSeconds);
  const timeWidth = ctx.measureText(timeText).width;
  ctx.font = "500 34px system-ui, sans-serif";
  const labelWidth = ctx.measureText("de práctica").width;
  const pillWidth = Math.max(timeWidth, labelWidth) + 120;

  const scrim = ctx.createRadialGradient(
    centerX,
    pillBottom - pillHeight / 2,
    10,
    centerX,
    pillBottom - pillHeight / 2,
    pillWidth,
  );
  scrim.addColorStop(0, "rgba(0, 0, 0, 0.55)");
  scrim.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = scrim;
  ctx.fillRect(0, pillBottom - pillHeight - pillWidth, WIDTH, pillHeight + pillWidth * 2);

  ctx.textAlign = "center";
  ctx.fillStyle = TEXT_ON_PHOTO;
  ctx.font = "700 104px system-ui, sans-serif";
  ctx.fillText(timeText, centerX, pillBottom - 96);

  ctx.fillStyle = MUTED_ON_PHOTO;
  ctx.font = "500 34px system-ui, sans-serif";
  ctx.fillText("de práctica", centerX, pillBottom - 40);

  if (input.streakDays > 1) {
    drawStreakBadge(ctx, centerX, pillBottom - pillHeight - 24, input.streakDays);
  }

  drawCredit(ctx, centerX, HEIGHT - 72, icon);
}

function drawBoldLayout(
  ctx: CanvasRenderingContext2D,
  input: StoryCardInput,
  visibleBlocks: { name: string; color: string; actualDurationSeconds: number }[],
  extraCount: number,
  icon: HTMLImageElement | null,
) {
  const topScrim = ctx.createLinearGradient(0, 0, 0, HEIGHT * 0.42);
  topScrim.addColorStop(0, "rgba(0, 0, 0, 0.78)");
  topScrim.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = topScrim;
  ctx.fillRect(0, 0, WIDTH, HEIGHT * 0.42);

  const marginX = 84;
  let y = 150;

  ctx.textAlign = "left";
  ctx.fillStyle = TEXT_ON_PHOTO;
  ctx.font = "700 200px system-ui, sans-serif";
  ctx.fillText(formatDurationShort(input.totalSeconds), marginX, y + 170);
  y += 200;

  ctx.font = "500 40px system-ui, sans-serif";
  ctx.fillStyle = MUTED_ON_PHOTO;
  const subtitle = input.sessionName
    ? `${input.sessionName} · ${formatStoryDate(input.date, input.locale ?? "es")}`
    : formatStoryDate(input.date, input.locale ?? "es");
  ctx.fillText(truncateToWidth(ctx, subtitle, WIDTH - marginX * 2), marginX, y);

  if (input.streakDays > 1) {
    y += 70;
    ctx.font = "600 34px system-ui, sans-serif";
    ctx.fillStyle = MUTED_ON_PHOTO;
    ctx.fillText(`🔥 Racha de ${input.streakDays} días`, marginX, y);
  }

  // Panel translúcido con las categorías, apoyado en la zona baja — la foto
  // se sigue viendo alrededor, a diferencia del estilo Clásico.
  if (visibleBlocks.length > 0) {
    const rowHeight = 66;
    const panelPaddingY = 40;
    const panelHeight = visibleBlocks.length * rowHeight + panelPaddingY * 2 + (extraCount > 0 ? 40 : 0);
    const panelTop = HEIGHT - 210 - panelHeight;
    const panelWidth = WIDTH - marginX * 2;

    ctx.fillStyle = DARK_PANEL_BG;
    roundRectPath(ctx, marginX, panelTop, panelWidth, panelHeight, 32);
    ctx.fill();

    let rowY = panelTop + panelPaddingY + rowHeight / 2 - 12;
    for (const block of visibleBlocks) {
      drawCategoryRow(ctx, marginX + 36, rowY, panelWidth - 72, block);
      rowY += rowHeight;
    }
    if (extraCount > 0) {
      ctx.textAlign = "left";
      ctx.fillStyle = MUTED_ON_PHOTO;
      ctx.font = "500 28px system-ui, sans-serif";
      ctx.fillText(`+${extraCount} más`, marginX + 36, rowY - 6);
    }
  }

  drawCredit(ctx, WIDTH / 2, HEIGHT - 96, icon);
}

/**
 * Compone la foto capturada + el resumen de la sesión en una imagen
 * vertical 1080×1920 lista para Instagram Stories. Hermano de
 * session-share-card.ts (tarjeta solo-estadísticas) — no lo sustituye ni
 * reutiliza su código, para no arriesgar esa función ya existente.
 */
export async function generateSessionStoryBlob(input: StoryCardInput): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const rect = resolveDrawRect(
    input.transform,
    input.photoImage.naturalWidth,
    input.photoImage.naturalHeight,
    WIDTH,
    HEIGHT,
  );
  ctx.drawImage(input.photoImage, rect.x, rect.y, rect.width, rect.height);

  const icon = await loadIcon();
  const visibleBlocks = input.blocks.slice(0, MAX_VISIBLE_BLOCKS);
  const extraCount = input.blocks.length - visibleBlocks.length;

  switch (input.styleVariant) {
    case "classic":
      drawClassicLayout(ctx, input, visibleBlocks, extraCount, icon);
      break;
    case "minimal":
      drawMinimalLayout(ctx, input, icon);
      break;
    case "bold":
      drawBoldLayout(ctx, input, visibleBlocks, extraCount, icon);
      break;
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

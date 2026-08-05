import { formatDurationShort } from "@/core/domain/duration";

const WIDTH = 1080;
const HEIGHT = 1920;
const MAX_VISIBLE_BLOCKS = 8;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function roundRect(
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

/**
 * Tarjeta 1080×1920 (proporción de Historia de Instagram) con el resumen de
 * la sesión, para adjuntar como imagen al compartir — un enlace de texto no
 * sirve de nada en una Historia, tiene que ser una imagen. Usa los colores
 * del tema actual (incluido el acento que el usuario haya elegido) leyendo
 * las custom properties en vez de un color fijo, así sale coherente con su
 * propia app.
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

  ctx.fillStyle = primary;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.textAlign = "center";
  ctx.fillStyle = onPrimary;

  let y = 160;

  const icon = await loadIcon();
  if (icon) {
    const size = 120;
    ctx.save();
    roundRect(ctx, WIDTH / 2 - size / 2, y, size, size, 28);
    ctx.clip();
    ctx.drawImage(icon, WIDTH / 2 - size / 2, y, size, size);
    ctx.restore();
    y += size + 40;
  }

  ctx.font = "600 44px system-ui, sans-serif";
  ctx.fillText("PracticeFlow", WIDTH / 2, y);
  y += 160;

  ctx.font = "700 148px system-ui, sans-serif";
  ctx.fillText(formatDurationShort(input.totalSeconds), WIDTH / 2, y);
  y += 90;

  ctx.font = "500 48px system-ui, sans-serif";
  ctx.globalAlpha = 0.85;
  ctx.fillText(
    `en ${input.blockCount} ${input.blockCount === 1 ? "bloque" : "bloques"}`,
    WIDTH / 2,
    y,
  );
  ctx.globalAlpha = 1;
  y += 110;

  const visibleBlocks = input.blocks.slice(0, MAX_VISIBLE_BLOCKS);
  const extraCount = input.blocks.length - visibleBlocks.length;
  const rowHeight = 96;
  const rowWidth = 780;
  const rowGap = 20;
  const rowX = WIDTH / 2 - rowWidth / 2;

  ctx.textAlign = "left";
  for (const block of visibleBlocks) {
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = onPrimary;
    roundRect(ctx, rowX, y, rowWidth, rowHeight, 20);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.fillStyle = block.color;
    ctx.beginPath();
    ctx.arc(rowX + 48, y + rowHeight / 2, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = onPrimary;
    ctx.font = "500 38px system-ui, sans-serif";
    const maxNameWidth = rowWidth - 220;
    let name = block.name;
    while (ctx.measureText(name).width > maxNameWidth && name.length > 1) {
      name = name.slice(0, -1);
    }
    if (name !== block.name) name += "…";
    ctx.fillText(name, rowX + 88, y + rowHeight / 2 + 14);

    ctx.textAlign = "right";
    ctx.font = "500 38px system-ui, sans-serif";
    ctx.globalAlpha = 0.85;
    ctx.fillText(
      formatDurationShort(block.actualDurationSeconds),
      rowX + rowWidth - 32,
      y + rowHeight / 2 + 14,
    );
    ctx.globalAlpha = 1;
    ctx.textAlign = "left";

    y += rowHeight + rowGap;
  }

  if (extraCount > 0) {
    ctx.textAlign = "center";
    ctx.font = "500 36px system-ui, sans-serif";
    ctx.globalAlpha = 0.7;
    ctx.fillText(`+${extraCount} más`, WIDTH / 2, y + 20);
    ctx.globalAlpha = 1;
    y += 70;
  }

  if (input.streakDays > 1) {
    ctx.textAlign = "center";
    ctx.font = "500 40px system-ui, sans-serif";
    ctx.globalAlpha = 0.75;
    ctx.fillText(`🔥 racha de ${input.streakDays} días`, WIDTH / 2, HEIGHT - 140);
    ctx.globalAlpha = 1;
  }

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export interface StoryTransform {
  /** 0..1, fraction of the available pan range — 0.5 is centered. */
  offsetX: number;
  offsetY: number;
  /** 1 = tightest cover-fit, up to 3 = zoomed in. */
  zoom: number;
}

export const DEFAULT_STORY_TRANSFORM: StoryTransform = { offsetX: 0.5, offsetY: 0.5, zoom: 1 };

/**
 * Escala a la que la imagen cubre justo el marco (object-fit: cover). El
 * marco siempre es 9:16 sea cual sea su tamaño en px — la preview en
 * pantalla y el canvas final (1080×1920) llaman a esto con su propio
 * frameWidth/frameHeight, pero como el resultado es un factor de escala
 * puro, offsetX/offsetY (fracciones) valen igual para los dos.
 */
export function coverFitBaseScale(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): number {
  return Math.max(frameWidth / imageWidth, frameHeight / imageHeight);
}

/**
 * Limita offsetX/offsetY para que la imagen (ya escalada a baseScale*zoom)
 * siga cubriendo el marco entero — sin esto, arrastrar o hacer zoom-out
 * dejaría huecos en blanco en los bordes.
 */
export function clampOffset(
  offsetX: number,
  offsetY: number,
  zoom: number,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): { offsetX: number; offsetY: number } {
  const baseScale = coverFitBaseScale(imageWidth, imageHeight, frameWidth, frameHeight);
  const scale = baseScale * zoom;
  const drawnWidth = imageWidth * scale;
  const drawnHeight = imageHeight * scale;
  const maxShiftX = Math.max(0, (drawnWidth - frameWidth) / 2);
  const maxShiftY = Math.max(0, (drawnHeight - frameHeight) / 2);

  // offsetX/Y de 0..1 representan "todo a la izquierda/arriba" .. "todo a
  // la derecha/abajo" del rango de desplazamiento disponible.
  return {
    offsetX: maxShiftX === 0 ? 0.5 : clamp01(offsetX),
    offsetY: maxShiftY === 0 ? 0.5 : clamp01(offsetY),
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

/**
 * Traduce el transform normalizado a un rectángulo de destino en px de
 * marco (top-left + ancho/alto) para dibujar la imagen — usado igual por
 * la preview CSS (transform: translate/scale) y por ctx.drawImage.
 */
export function resolveDrawRect(
  transform: StoryTransform,
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
): { x: number; y: number; width: number; height: number } {
  const baseScale = coverFitBaseScale(imageWidth, imageHeight, frameWidth, frameHeight);
  const scale = baseScale * transform.zoom;
  const drawnWidth = imageWidth * scale;
  const drawnHeight = imageHeight * scale;
  const maxShiftX = Math.max(0, (drawnWidth - frameWidth) / 2);
  const maxShiftY = Math.max(0, (drawnHeight - frameHeight) / 2);

  const centerX = frameWidth / 2 + (transform.offsetX - 0.5) * 2 * maxShiftX * -1;
  const centerY = frameHeight / 2 + (transform.offsetY - 0.5) * 2 * maxShiftY * -1;

  return {
    x: centerX - drawnWidth / 2,
    y: centerY - drawnHeight / 2,
    width: drawnWidth,
    height: drawnHeight,
  };
}

/**
 * Reduce la foto de perfil en el propio dispositivo antes de subirla.
 *
 * Antes se subía tal cual (hasta 5 MB; de media unos 350 KB) y se servía
 * entera cada vez que aparecía en el Feed o en la lista de amigos, donde se
 * pinta a 40 px: cada vista descargaba la foto completa y gastaba el cupo de
 * transferencia de Supabase. Reducida a 512 px de lado mayor queda en unas
 * decenas de KB y sigue viéndose nítida en el visor ampliado, incluso en
 * pantallas de alta densidad.
 */

/** Lado mayor de la foto guardada. */
const MAX_SIDE = 512;
const QUALITY = 0.85;

async function decode(
  file: File,
): Promise<{ source: CanvasImageSource; width: number; height: number }> {
  try {
    // "from-image": respeta la rotación EXIF de las fotos hechas con el
    // móvil en vertical, que si no saldrían tumbadas.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    // Safari antiguo no tiene createImageBitmap para todo; <img> decodifica
    // todo lo que el navegador sepa mostrar.
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      return { source: img, width: img.naturalWidth, height: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function toBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

/** Devuelve la foto reducida en WebP (JPEG donde el navegador no sabe
 * codificar WebP, como Safari). Si algo falla, devuelve el fichero original:
 * el servidor sigue validando tipo y tamaño, así que como mucho se sube
 * como antes, nunca se bloquea la subida. */
export async function shrinkAvatar(file: File): Promise<File> {
  try {
    const { source, width, height } = await decode(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.imageSmoothingQuality = "high";
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) source.close();

    let blob = await toBlob(canvas, "image/webp");
    if (!blob || blob.type !== "image/webp") {
      // JPEG no tiene transparencia: sin fondo blanco, las zonas
      // transparentes de un PNG saldrían negras.
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      blob = await toBlob(canvas, "image/jpeg");
    }
    if (!blob || blob.size >= file.size) return file;

    const extension = blob.type === "image/webp" ? "webp" : "jpg";
    return new File([blob], `avatar.${extension}`, { type: blob.type });
  } catch {
    return file;
  }
}

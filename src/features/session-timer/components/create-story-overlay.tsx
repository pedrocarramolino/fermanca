"use client";

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Camera, ChevronLeft, Download, Loader2, Share2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { formatDurationShort } from "@/core/domain/duration";
import {
  getCurrentStreakDays,
  getSessionStartedAt,
  getSessionTemplateName,
} from "@/features/session-timer/application/actions";
import {
  clampOffset,
  DEFAULT_STORY_TRANSFORM,
  resolveDrawRect,
  type StoryTransform,
} from "@/features/session-timer/lib/story-transform";
import {
  generateSessionStoryBlob,
  type StoryStyleVariant,
} from "@/features/session-timer/lib/session-story-card";

type Step = "capture" | "edit" | "preview";
type StoryBlock = { name: string; color: string; actualDurationSeconds: number };

const STYLE_VARIANTS: StoryStyleVariant[] = ["classic", "minimal", "bold"];
const STYLE_LABEL_KEYS: Record<StoryStyleVariant, string> = {
  classic: "styleClassic",
  minimal: "styleMinimal",
  bold: "styleBold",
};
const MAX_VISIBLE_BLOCKS_PREVIEW = 5;

function formatPreviewDate(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toLocaleDateString();
  }
}

function formatPreviewTime(date: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
  } catch {
    return date.toLocaleTimeString();
  }
}

/** "18:30–19:45", o null si falta alguna de las dos horas (p. ej. mientras
 * startedAt aún no ha llegado del servidor) — igual que en
 * session-story-card.ts, la imagen final. */
function formatPreviewTimeRange(
  startedAt: Date | null,
  endedAt: Date | null,
  locale: string,
): string | null {
  if (!startedAt || !endedAt) return null;
  return `${formatPreviewTime(startedAt, locale)}–${formatPreviewTime(endedAt, locale)}`;
}

function canShareNatively(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/** Foto posicionada con el mismo cálculo (resolveDrawRect) que usa el
 * canvas final — así la preview en pantalla y la imagen exportada
 * coinciden siempre, aunque el marco en pantalla mida menos px que el
 * canvas de 1080×1920. */
function PhotoPreview({
  frameRef,
  photoUrl,
  photoImage,
  transform,
}: {
  frameRef: React.RefObject<HTMLDivElement | null>;
  photoUrl: string;
  photoImage: HTMLImageElement;
  transform: StoryTransform;
}) {
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;

    function measure() {
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setFrameSize({ width: rect.width, height: rect.height });
    }

    measure();
    // ResizeObserver cubre además un giro de pantalla mientras el marco
    // está abierto — measure() ya deja algo pintado desde el primer frame.
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [frameRef]);

  if (frameSize.width === 0) return null;

  const rect = resolveDrawRect(
    transform,
    photoImage.naturalWidth,
    photoImage.naturalHeight,
    frameSize.width,
    frameSize.height,
  );
  const scaleX = rect.width / photoImage.naturalWidth;

  return (
    <img
      src={photoUrl}
      alt=""
      draggable={false}
      className="pointer-events-none absolute top-0 left-0 max-w-none touch-none select-none"
      style={{
        width: photoImage.naturalWidth,
        height: photoImage.naturalHeight,
        transform: `translate(${rect.x}px, ${rect.y}px) scale(${scaleX})`,
        transformOrigin: "0 0",
      }}
    />
  );
}

/** Preview barata en CSS (no canvas) de cómo quedarían las estadísticas
 * reales de la sesión sobre la foto en cada estilo — así se puede comparar
 * cuál queda mejor cambiando de swatch, sin recomponer el canvas hasta
 * pulsar "Continuar". Aproxima el layout de session-story-card.ts, no
 * tiene que ser pixel-perfect. */
function StoryStatsPreview({
  variant,
  totalSeconds,
  blockCount,
  blocks,
  streakDays,
  sessionName,
  date,
  startedAt,
  endedAt,
  locale,
}: {
  variant: StoryStyleVariant;
  totalSeconds: number;
  blockCount: number;
  blocks: StoryBlock[];
  streakDays: number;
  sessionName: string | null;
  date: Date;
  startedAt: Date | null;
  endedAt: Date | null;
  locale: string;
}) {
  const timeText = formatDurationShort(totalSeconds);
  const dateText = formatPreviewDate(date, locale);
  const timeRangeText = formatPreviewTimeRange(startedAt, endedAt, locale);
  const visibleBlocks = blocks.slice(0, MAX_VISIBLE_BLOCKS_PREVIEW);
  const extraCount = blocks.length - visibleBlocks.length;

  const categoryRows = (
    <div className="flex flex-col gap-1.5">
      {visibleBlocks.map((block, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <span
            className="size-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: block.color }}
            aria-hidden
          />
          <span className="flex-1 truncate font-medium">{block.name}</span>
          <span className="text-white/70">{formatDurationShort(block.actualDurationSeconds)}</span>
        </div>
      ))}
      {extraCount > 0 && <span className="text-xs text-white/60">+{extraCount} más</span>}
    </div>
  );

  if (variant === "minimal") {
    return (
      <div className="pointer-events-none absolute inset-x-0 bottom-10 flex flex-col items-center gap-2 px-6 text-center">
        {streakDays > 1 && (
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
            🔥 {streakDays} días
          </span>
        )}
        <div className="rounded-2xl bg-black/40 px-6 py-4 backdrop-blur-sm">
          <div className="text-4xl leading-none font-extrabold">{timeText}</div>
          <div className="mt-1 text-sm text-white/80">de práctica</div>
          {timeRangeText && <div className="mt-1 text-xs text-white/60">{timeRangeText}</div>}
        </div>
      </div>
    );
  }

  if (variant === "bold") {
    return (
      <>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[42%] bg-gradient-to-b from-black/75 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-col gap-1 p-4">
          <div className="text-5xl leading-none font-extrabold">{timeText}</div>
          <div className="truncate text-sm text-white/80">
            {[sessionName, dateText, timeRangeText].filter(Boolean).join(" · ")}
          </div>
          {streakDays > 1 && (
            <div className="text-xs text-white/70">🔥 Racha de {streakDays} días</div>
          )}
        </div>
        {visibleBlocks.length > 0 && (
          <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-xl bg-black/45 p-3 backdrop-blur-sm">
            {categoryRows}
          </div>
        )}
      </>
    );
  }

  // classic
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-black/85 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 p-4">
        {sessionName && (
          <div className="truncate text-sm font-semibold text-white/80">{sessionName}</div>
        )}
        <div className="text-5xl leading-none font-extrabold">{timeText}</div>
        <div className="text-sm text-white/80">
          en {blockCount} {blockCount === 1 ? "bloque" : "bloques"}
        </div>
        <div className="mt-1">{categoryRows}</div>
        <div className="mt-1 text-xs text-white/60">
          {[dateText, timeRangeText, streakDays > 1 ? `🔥 ${streakDays} días` : null]
            .filter(Boolean)
            .join(" · ")}
        </div>
      </div>
    </>
  );
}

export function CreateStoryOverlay({
  sessionId,
  totalSeconds,
  blockCount,
  blocks,
  onClose,
}: {
  sessionId: string;
  totalSeconds: number;
  blockCount: number;
  blocks: StoryBlock[];
  onClose: () => void;
}) {
  const t = useTranslations("StoryCreator");
  const locale = useLocale();
  const [step, setStep] = useState<Step>("capture");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
  const [transform, setTransform] = useState<StoryTransform>(DEFAULT_STORY_TRANSFORM);
  const [styleVariant, setStyleVariant] = useState<StoryStyleVariant>("classic");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [streakDays, setStreakDays] = useState(0);
  const [sessionName, setSessionName] = useState<string | null>(null);
  // Hora a la que empezó la sesión, para el rango "18:30–19:45" de la
  // imagen — null hasta que llega del servidor (o si falla la lectura, en
  // cuyo caso el rango se omite del todo, ver formatStoryTimeRange).
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  // Solo para la FECHA mostrada ("11 de agosto de 2026") — no para la hora
  // de fin del rango, que se calcula aparte (ver endedAt) porque "ahora"
  // (el momento en que se abre este editor) puede incluir tiempo de una
  // categoría fantasma que no cuenta como practicado.
  const [captureDate] = useState(() => new Date());
  // Hora de fin = inicio + tiempo realmente practicado (totalSeconds ya
  // viene sin los bloques de categorías fantasma, ver SessionSummary) — así
  // el rango de horas de la imagen es coherente con la duración que se
  // muestra en ella, en vez de con el reloj real, que puede incluir tiempo
  // de una categoría fantasma o el rato que ha tardado el usuario en elegir
  // la foto y el estilo antes de exportar.
  const endedAt = startedAt ? new Date(startedAt.getTime() + totalSeconds * 1000) : null;
  const frameRef = useRef<HTMLDivElement>(null);
  const dragState = useRef<{
    startX: number;
    startY: number;
    startOffsetX: number;
    startOffsetY: number;
  } | null>(null);

  useEffect(() => {
    void getCurrentStreakDays()
      .then(setStreakDays)
      .catch(() => {
        // Solo decora la tarjeta — si falla, se comparte sin racha.
      });
    void getSessionTemplateName(sessionId)
      .then(setSessionName)
      .catch(() => {
        // Sesión improvisada o fallo de red — se omite el nombre.
      });
    void getSessionStartedAt(sessionId)
      .then((iso) => setStartedAt(iso ? new Date(iso) : null))
      .catch(() => {
        // Fallo de red — se omite el rango de horas del todo.
      });
  }, [sessionId]);

  // Los object URL de la foto capturada y del resultado compuesto viven
  // más de un render (se usan en el <img> de preview) — hay que liberarlos
  // explícitamente o se acumulan cada vez que el usuario repite la foto.
  useEffect(() => {
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

  useEffect(() => {
    return () => {
      if (resultUrl) URL.revokeObjectURL(resultUrl);
    };
  }, [resultUrl]);

  function resetPhoto() {
    setPhotoUrl(null);
    setPhotoImage(null);
    setTransform(DEFAULT_STORY_TRANSFORM);
  }

  function resetResult() {
    setResultUrl(null);
    setResultBlob(null);
  }

  async function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    // El usuario canceló la cámara/selector — el input simplemente no trae
    // archivo, no hay ningún error que capturar.
    if (!file) return;

    const url = URL.createObjectURL(file);
    const img = new Image();
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      return;
    }
    setPhotoUrl(url);
    setPhotoImage(img);
    setTransform(DEFAULT_STORY_TRANSFORM);
    setStep("edit");
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!photoImage) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = {
      startX: event.clientX,
      startY: event.clientY,
      startOffsetX: transform.offsetX,
      startOffsetY: transform.offsetY,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragState.current || !photoImage || !frameRef.current) return;
    const frame = frameRef.current.getBoundingClientRect();
    const baseScale = Math.max(
      frame.width / photoImage.naturalWidth,
      frame.height / photoImage.naturalHeight,
    );
    const scale = baseScale * transform.zoom;
    const drawnWidth = photoImage.naturalWidth * scale;
    const drawnHeight = photoImage.naturalHeight * scale;
    const maxShiftX = Math.max(0, (drawnWidth - frame.width) / 2);
    const maxShiftY = Math.max(0, (drawnHeight - frame.height) / 2);

    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;

    const nextOffsetX =
      maxShiftX === 0 ? 0.5 : dragState.current.startOffsetX - dx / (maxShiftX * 2);
    const nextOffsetY =
      maxShiftY === 0 ? 0.5 : dragState.current.startOffsetY - dy / (maxShiftY * 2);

    const clamped = clampOffset(
      nextOffsetX,
      nextOffsetY,
      transform.zoom,
      photoImage.naturalWidth,
      photoImage.naturalHeight,
      frame.width,
      frame.height,
    );
    setTransform((prev) => ({ ...prev, ...clamped }));
  }

  function handlePointerUp() {
    dragState.current = null;
  }

  function handleZoomChange(value: number | readonly number[]) {
    const zoom = Array.isArray(value) ? value[0]! : value;
    if (!photoImage || !frameRef.current) {
      setTransform((prev) => ({ ...prev, zoom }));
      return;
    }
    const frame = frameRef.current.getBoundingClientRect();
    const clamped = clampOffset(
      transform.offsetX,
      transform.offsetY,
      zoom,
      photoImage.naturalWidth,
      photoImage.naturalHeight,
      frame.width,
      frame.height,
    );
    setTransform({ ...clamped, zoom });
  }

  async function handleContinue() {
    if (!photoImage || isBusy) return;
    setIsBusy(true);
    try {
      const blob = await generateSessionStoryBlob({
        photoImage,
        transform,
        styleVariant,
        totalSeconds,
        blockCount,
        blocks,
        streakDays,
        sessionName,
        date: captureDate,
        startedAt,
        endedAt,
        locale,
      });
      if (!blob) return;
      setResultBlob(blob);
      setResultUrl(URL.createObjectURL(blob));
      setStep("preview");
    } finally {
      setIsBusy(false);
    }
  }

  function handleSave() {
    if (!resultBlob) return;
    const url = URL.createObjectURL(resultBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "practiceflow-story.png";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function handleShare() {
    if (!resultBlob) return;
    const file = new File([resultBlob], "practiceflow-story.png", { type: "image/png" });
    if (!canShareNatively() || !navigator.canShare?.({ files: [file] })) {
      handleSave();
      return;
    }
    setIsBusy(true);
    try {
      await navigator.share({ title: "PracticeFlow", files: [file] });
    } catch {
      // El usuario canceló el selector nativo — no es un error que mostrar.
    } finally {
      setIsBusy(false);
    }
  }

  function handleBack() {
    if (step === "edit") {
      resetPhoto();
      setStep("capture");
    } else if (step === "preview") {
      resetResult();
      setStep("edit");
    }
  }

  function handleClose() {
    resetPhoto();
    resetResult();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="flex items-center justify-between p-3">
        {step === "capture" ? (
          <span />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="text-white hover:bg-white/10 hover:text-white"
          >
            <ChevronLeft className="size-5" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClose}
          aria-label={t("close")}
          className="text-white hover:bg-white/10 hover:text-white"
        >
          <X className="size-5" />
        </Button>
      </div>

      {step === "capture" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
          <Camera className="size-16 text-white/60" />
          <p className="text-lg font-medium">{t("capturePrompt")}</p>
          <label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelected}
              className="hidden"
            />
            <span className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black">
              <Camera className="size-4" />
              {t("captureButton")}
            </span>
          </label>
        </div>
      )}

      {step === "edit" && photoImage && photoUrl && (
        <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
          <div
            ref={frameRef}
            className="relative mx-auto aspect-[9/16] w-full max-w-xs shrink-0 touch-none overflow-hidden rounded-2xl bg-black"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <PhotoPreview
              frameRef={frameRef}
              photoUrl={photoUrl}
              photoImage={photoImage}
              transform={transform}
            />
            <StoryStatsPreview
              variant={styleVariant}
              totalSeconds={totalSeconds}
              blockCount={blockCount}
              blocks={blocks}
              streakDays={streakDays}
              sessionName={sessionName}
              date={captureDate}
              startedAt={startedAt}
              endedAt={endedAt}
              locale={locale}
            />
          </div>

          <div className="mx-auto flex w-full max-w-xs flex-col gap-2">
            <span className="text-xs text-white/60">{t("zoomLabel")}</span>
            <Slider
              value={[transform.zoom]}
              min={1}
              max={3}
              step={0.01}
              onValueChange={handleZoomChange}
            />
          </div>

          <div className="mx-auto flex w-full max-w-xs justify-center gap-2">
            {STYLE_VARIANTS.map((variant) => (
              <button
                key={variant}
                type="button"
                onClick={() => setStyleVariant(variant)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  styleVariant === variant ? "bg-white text-black" : "bg-white/10 text-white"
                }`}
              >
                {t(STYLE_LABEL_KEYS[variant])}
              </button>
            ))}
          </div>

          <Button
            type="button"
            onClick={handleContinue}
            disabled={isBusy}
            className="mx-auto w-full max-w-xs"
          >
            {isBusy && <Loader2 className="size-4 animate-spin" />}
            {isBusy ? t("compositing") : t("continueToPreview")}
          </Button>
        </div>
      )}

      {step === "preview" && resultUrl && (
        <div className="flex flex-1 flex-col gap-4 p-4">
          <img
            src={resultUrl}
            alt=""
            className="mx-auto aspect-[9/16] w-full max-w-xs rounded-2xl object-cover"
          />
          <div className="mx-auto mt-auto flex w-full max-w-xs gap-3 pb-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={handleSave}
            >
              <Download className="size-4" />
              {t("save")}
            </Button>
            <Button type="button" className="flex-1" onClick={handleShare} disabled={isBusy}>
              <Share2 className="size-4" />
              {t("share")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

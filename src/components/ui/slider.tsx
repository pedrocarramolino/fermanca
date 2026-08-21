import { Slider as SliderPrimitive } from "@base-ui/react/slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  "aria-label": ariaLabel,
  accentColor,
  style,
  ...props
}: SliderPrimitive.Root.Props & { "aria-label"?: string; accentColor?: string }) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max];

  return (
    <SliderPrimitive.Root
      // El color por defecto es --primary (variable con ese mismo nombre,
      // como fallback); accentColor lo pisa vía --slider-accent inline, que
      // por especificidad siempre gana sobre la clase de abajo en este mismo
      // elemento — así un slider normal (volumen, intensidad del cristal…)
      // no cambia nada, y solo el que pase accentColor (p. ej. el de minutos
      // de un bloque, con el color de su categoría) se pinta distinto.
      className={cn(
        "data-horizontal:w-full data-vertical:h-full [--slider-accent:var(--primary)]",
        className,
      )}
      style={accentColor ? ({ ...style, "--slider-accent": accentColor } as React.CSSProperties) : style}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="bg-muted relative grow overflow-hidden rounded-full select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          <SliderPrimitive.Indicator
            data-slot="slider-range"
            className="bg-(--slider-accent) select-none data-horizontal:h-full data-vertical:w-full"
          />
        </SliderPrimitive.Track>
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
            className="border-(--slider-accent) ring-(--slider-accent)/50 relative block size-3 shrink-0 rounded-full border bg-white transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  );
}

export { Slider };

/**
 * Filtro SVG de refracción para el estilo "Liquid Glass": a diferencia de un
 * simple `backdrop-blur` (que solo difumina), esto desplaza los píxeles del
 * fondo con una textura de ruido suave, como si de verdad hubiera un cristal
 * curvado deformando lo que se ve a través — el sello visual de la Liquid
 * Glass de iOS (WWDC 2025), no del "frosted glass" plano de siempre. Se
 * monta una única vez en el layout raíz; `url(#liquid-glass-distortion)` lo
 * referencian los `glass:`-utilities de cada superficie (ver globals.css).
 * Oculto vía tamaño 0 (no `display:none`, que en algunos motores impide que
 * el filtro se calcule).
 */
export function LiquidGlassFilter() {
  return (
    <svg aria-hidden className="pointer-events-none absolute size-0 overflow-hidden">
      <filter id="liquid-glass-distortion" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.005 0.008"
          numOctaves={2}
          seed={7}
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation={3} result="softNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softNoise"
          scale={55}
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  );
}

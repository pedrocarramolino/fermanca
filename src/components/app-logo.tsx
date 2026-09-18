"use client";

import { ViewTransition } from "react";
import { APP_LOGO_VT_NAME, useSplashDone } from "@/components/launch-animation";

/**
 * El logo de la cabecera. Toma el nombre del elemento compartido solo cuando
 * el splash ya no está: mientras se ve, el nombre lo lleva su icono, y dos
 * elementos montados a la vez con el mismo nombre romperían el emparejamiento
 * (y con él, el recorrido del icono hasta aquí).
 */
export function AppLogo() {
  const splashDone = useSplashDone();

  // eslint-disable-next-line @next/next/no-img-element
  const logo = <img src="/icons/icon-96x96.png" alt="" className="size-7 rounded-lg" />;

  if (!splashDone) return logo;

  return (
    <ViewTransition name={APP_LOGO_VT_NAME} share="morph" default="none">
      {logo}
    </ViewTransition>
  );
}

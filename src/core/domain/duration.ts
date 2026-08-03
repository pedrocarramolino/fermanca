export function formatDurationShort(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0 ? `${hours} h` : `${hours} h ${remainder} min`;
}

/** Horas con un decimal, para ejes/tooltips de gráficos (p. ej. "2.5 h"). */
export function secondsToHoursDecimal(totalSeconds: number): number {
  return Math.round((totalSeconds / 3600) * 10) / 10;
}

export function formatDurationClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

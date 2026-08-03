import "server-only";
import { timingSafeEqual } from "crypto";

/** Comparación en tiempo constante — evita filtrar el secreto carácter a
 * carácter por temporización, y falla explícitamente si CRON_SECRET no
 * está configurado (en vez de comparar contra el literal "Bearer undefined"). */
export function isAuthorizedCronRequest(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(request.headers.get("authorization") ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

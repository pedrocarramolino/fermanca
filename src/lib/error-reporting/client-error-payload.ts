/** Lo que manda el navegador a /api/errors. Vive aparte para que el
 * endpoint y quien lo llama no puedan desincronizarse. */
export const CLIENT_ERROR_KINDS = ["boundary", "global", "unhandled"] as const;
export type ClientErrorKind = (typeof CLIENT_ERROR_KINDS)[number];

export interface ClientErrorPayload {
  kind: ClientErrorKind;
  name: string;
  message: string;
  stack: string | null;
  path: string;
}

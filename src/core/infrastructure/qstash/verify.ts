import "server-only";
import { Receiver } from "@upstash/qstash";

let cachedReceiver: Receiver | null = null;

function getReceiver(): Receiver {
  cachedReceiver ??= new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY!,
  });
  return cachedReceiver;
}

/** No se comprueba `url` contra la request real: por el proxy de Vercel el
 * host/protocolo que ve el runtime puede no coincidir byte a byte con el que
 * usó QStash para firmar, y la firma sobre cuerpo + clave ya es suficiente —
 * es un HMAC que solo Upstash y nosotros podemos producir. */
export async function verifyQstashSignature(request: Request, rawBody: string): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  if (!signature) return false;
  try {
    return await getReceiver().verify({ signature, body: rawBody });
  } catch {
    return false;
  }
}

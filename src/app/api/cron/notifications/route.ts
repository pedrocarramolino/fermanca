import { NextResponse } from "next/server";
import { createServiceClient } from "@/core/infrastructure/supabase/service-client";
import { SupabasePushSubscriptionRepository } from "@/core/infrastructure/supabase/repositories/push-subscription-repository";
import { sendPush } from "@/core/infrastructure/push/send-push";

/**
 * pg_cron llama aquí cada minuto (ver la migración
 * 20261103120000_notifications_dispatcher.sql) para mandar los recordatorios
 * y los avisos de calendario que tocan. Sustituye a un Schedule de QStash por
 * cada uno: el plan gratuito solo admite 10 para toda la app.
 *
 * claim_due_notifications devuelve lo pendiente y lo marca como enviado en
 * la misma sentencia, así que aunque esta ruta se llame dos veces seguidas
 * nadie recibe el mismo aviso dos veces.
 */
/**
 * Supabase a veces responde un 500 suelto ("Internal server error.", visto
 * el 15/11/2026): se reintenta una vez antes de rendirse. Y si se rinde, se
 * lanza un Error de verdad con el paso que falló — el error de Supabase es
 * un objeto plano y el aviso por correo solo decía "[object Object]".
 */
async function withRetry<T>(
  step: string,
  run: () => PromiseLike<{ data: T; error: { message: string } | null }>,
): Promise<NonNullable<T>> {
  let result = await run();
  if (result.error) result = await run();
  if (result.error) throw new Error(`${step}: ${result.error.message}`);
  if (result.data == null) throw new Error(`${step}: respuesta vacía`);
  return result.data;
}

export async function POST(request: Request) {
  const supabase = createServiceClient();

  // La clave vive solo en Vault (la genera la migración): se comprueba allí,
  // así no hay que copiarla a las variables de entorno de Vercel.
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const valid = await withRetry("verify_notifications_cron_secret", () =>
    supabase.rpc("verify_notifications_cron_secret", { p_secret: token }),
  );
  if (!valid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const due = await withRetry("claim_due_notifications", () =>
    supabase.rpc("claim_due_notifications", {}),
  );
  if (due.length === 0) return NextResponse.json({ sent: 0 });

  const ownerIds = [...new Set(due.map((item) => item.owner_id))];
  const subscriptions = await withRetry("push_subscriptions", () =>
    supabase.from("push_subscriptions").select("*").in("owner_id", ownerIds),
  );

  const pushRepo = new SupabasePushSubscriptionRepository(supabase);
  let sent = 0;

  await Promise.all(
    due.flatMap((item) =>
      subscriptions
        .filter((sub) => sub.owner_id === item.owner_id)
        .map(async (sub) => {
          const result = await sendPush(
            { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
            item.kind === "calendar_event"
              ? {
                  kind: "reminder",
                  title: item.title ?? "Fermança",
                  body: "El evento que marcaste se acerca.",
                  url: "/reminders",
                }
              : {
                  kind: "reminder",
                  title: "¡A practicar!",
                  body: "Es la hora que marcaste para tu sesión de hoy.",
                  url: "/",
                },
          );
          if (result.ok) sent += 1;
          if (result.expired) await pushRepo.deleteByEndpoint(sub.endpoint);
        }),
    ),
  );

  return NextResponse.json({ due: due.length, sent });
}

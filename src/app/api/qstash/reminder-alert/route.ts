import { NextResponse } from "next/server";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";
import { deleteOrphanSchedule, reminderScheduleId } from "@/core/infrastructure/qstash/client";

/**
 * Solo para los Schedules de QStash creados antes del 3/11/2026: los
 * recordatorios los manda ahora /api/cron/notifications (pg_cron, cada
 * minuto), así que si uno de estos salta, se borra a sí mismo sin enviar
 * nada — si enviara, el recordatorio llegaría dos veces.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyQstashSignature(request, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { reminderId } = JSON.parse(rawBody) as { reminderId: string };
  await deleteOrphanSchedule(request, reminderScheduleId(reminderId));
  return NextResponse.json({ sent: 0, retired: true });
}

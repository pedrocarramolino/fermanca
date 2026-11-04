import { NextResponse } from "next/server";
import { verifyQstashSignature } from "@/core/infrastructure/qstash/verify";
import { calendarEventScheduleId, deleteOrphanSchedule } from "@/core/infrastructure/qstash/client";

/**
 * Solo para los Schedules de QStash creados antes del 3/11/2026: los avisos
 * de calendario los manda ahora /api/cron/notifications (pg_cron, cada
 * minuto), así que si uno de estos salta, se borra a sí mismo sin enviar
 * nada — si enviara, el aviso llegaría dos veces.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!(await verifyQstashSignature(request, rawBody))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { eventId } = JSON.parse(rawBody) as { eventId: string };
  await deleteOrphanSchedule(request, calendarEventScheduleId(eventId));
  return NextResponse.json({ sent: 0, retired: true });
}

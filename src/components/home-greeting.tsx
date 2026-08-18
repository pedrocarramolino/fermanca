"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

type TimeOfDay = "morning" | "afternoon" | "evening";

const GREETING_KEY: Record<TimeOfDay, "greetingMorning" | "greetingAfternoon" | "greetingEvening"> = {
  morning: "greetingMorning",
  afternoon: "greetingAfternoon",
  evening: "greetingEvening",
};

function timeOfDayForHour(hour: number): TimeOfDay {
  if (hour < 6) return "evening";
  if (hour < 12) return "morning";
  if (hour < 20) return "afternoon";
  return "evening";
}

/**
 * El saludo depende de la hora LOCAL de quien mira la pantalla, no la del
 * servidor (que en Vercel es UTC) — por eso se calcula en un efecto, no
 * durante el render inicial: el servidor y el primer pintado del cliente
 * tienen que coincidir para no romper la hidratación, así que ambos
 * arrancan en null (greetingNeutral) y el efecto actualiza justo después,
 * ya con la hora real del dispositivo.
 */
export function HomeGreeting({ username }: { username: string | null }) {
  const t = useTranslations("Home");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay | null>(null);

  useEffect(() => {
    // La hora del dispositivo no se conoce durante el renderizado inicial
    // (tiene que coincidir con el del servidor para no romper la
    // hidratación) — solo se puede leer aquí, ya en el cliente.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTimeOfDay(timeOfDayForHour(new Date().getHours()));
  }, []);

  const key = timeOfDay ? GREETING_KEY[timeOfDay] : "greetingNeutral";

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-bold text-balance">
        {username ? t(key, { username }) : t("greetingFallback")}
      </h1>
      <p className="text-muted-foreground">{t("greetingQuestion")}</p>
    </div>
  );
}

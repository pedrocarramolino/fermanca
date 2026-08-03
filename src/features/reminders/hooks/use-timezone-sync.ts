"use client";

import { useEffect } from "react";
import { syncTimezone } from "@/features/reminders/application/actions";

/** Detecta la zona horaria del navegador y la guarda si difiere de la actual. */
export function useTimezoneSync() {
  useEffect(() => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    void syncTimezone(timezone);
  }, []);
}

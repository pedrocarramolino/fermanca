"use client";

import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePushSubscription } from "@/features/reminders/hooks/use-push-subscription";
import { useTimezoneSync } from "@/features/reminders/hooks/use-timezone-sync";

export function PushSetup() {
  useTimezoneSync();
  const { status, subscribe, unsubscribe } = usePushSubscription();

  if (status === "unsupported") {
    return (
      <p className="text-muted-foreground text-sm">
        Este navegador no admite notificaciones push. En iPhone, instala PracticeFlow en la pantalla
        de inicio primero (Safari → Compartir → Añadir a pantalla de inicio).
      </p>
    );
  }

  if (status === "checking") return null;

  if (status === "subscribed") {
    return (
      <div className="border-border flex items-center justify-between rounded-lg border p-3">
        <div className="flex items-center gap-2 text-sm">
          <Bell className="text-primary size-4" />
          Notificaciones activadas en este dispositivo
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={unsubscribe}>
          Desactivar
        </Button>
      </div>
    );
  }

  return (
    <div className="border-border flex items-center justify-between rounded-lg border p-3">
      <div className="text-muted-foreground flex items-center gap-2 text-sm">
        <BellOff className="size-4" />
        Notificaciones desactivadas en este dispositivo
      </div>
      <Button type="button" size="sm" onClick={subscribe}>
        Activar
      </Button>
    </div>
  );
}

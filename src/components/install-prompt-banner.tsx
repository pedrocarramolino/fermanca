"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "practiceflow-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPromptBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      if (localStorage.getItem(DISMISSED_KEY)) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }
    function handleInstalled() {
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!deferredPrompt) return null;

  async function install() {
    await deferredPrompt!.prompt();
    await deferredPrompt!.userChoice;
    setDeferredPrompt(null);
  }

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDeferredPrompt(null);
  }

  return (
    <div className="bg-card border-border fixed inset-x-4 bottom-4 z-50 flex items-center justify-between gap-3 rounded-xl border p-3 shadow-lg sm:inset-x-auto sm:right-4 sm:w-80">
      <div className="flex items-center gap-2 text-sm">
        <Download className="size-4 shrink-0" />
        Instala PracticeFlow para acceso rápido y notificaciones.
      </div>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" onClick={install}>
          Instalar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Descartar"
          onClick={dismiss}
        >
          <X className="size-4" />
        </Button>
      </div>
    </div>
  );
}

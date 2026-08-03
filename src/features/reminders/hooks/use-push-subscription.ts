"use client";

import { useCallback, useEffect, useState } from "react";
import {
  removePushSubscription,
  savePushSubscription,
} from "@/features/reminders/application/actions";

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64Safe);
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

export type PushStatus = "unsupported" | "checking" | "subscribed" | "unsubscribed";

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("checking");

  const refresh = useCallback(async () => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window)
    ) {
      setStatus("unsupported");
      return;
    }
    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    setStatus(existing ? "subscribed" : "unsubscribed");
  }, []);

  useEffect(() => {
    // Comprobación async de un sistema externo (Service Worker/PushManager)
    // al montar — el setState real ocurre dentro de una promesa resuelta
    // más tarde, no de forma síncrona en el cuerpo del efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
  }, [refresh]);

  async function subscribe() {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) throw new Error("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY.");

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });
    await savePushSubscription(
      subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } },
    );
    setStatus("subscribed");
  }

  async function unsubscribe() {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await removePushSubscription(subscription.endpoint);
      await subscription.unsubscribe();
    }
    setStatus("unsubscribed");
  }

  return { status, subscribe, unsubscribe };
}

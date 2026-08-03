"use client";

import { useState, useSyncExternalStore } from "react";

const subscribe = () => () => {};

function getSnapshot(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function getServerSnapshot(): NotificationPermission | "unsupported" {
  return "unsupported";
}

export function useNotificationPermission() {
  const ambientPermission = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [override, setOverride] = useState<NotificationPermission | null>(null);

  async function request() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setOverride(result);
  }

  return { permission: override ?? ambientPermission, request };
}

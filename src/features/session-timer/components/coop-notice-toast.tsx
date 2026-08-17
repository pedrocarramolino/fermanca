"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { SessionEventType } from "@/core/domain/session-event";

export interface CoopNotice {
  id: string;
  type: SessionEventType;
  actorUsername: string;
}

const AUTO_DISMISS_MS = 4000;

function Toast({ notice, onDismiss }: { notice: CoopNotice; onDismiss: () => void }) {
  const t = useTranslations("SessionInvites.notices");
  // Ref a la última onDismiss en vez de meterla en las deps del efecto: es
  // una closure nueva en cada render del padre, y solo debe programarse un
  // temporizador una vez por aviso, no reiniciarse cada vez que el padre
  // vuelve a renderizar.
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  useEffect(() => {
    const timer = setTimeout(() => onDismissRef.current(), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="status"
      className="bg-foreground text-background pointer-events-auto rounded-full px-4 py-2 text-sm font-medium shadow-lg motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2"
    >
      {t(notice.type, { name: notice.actorUsername })}
    </div>
  );
}

/** Pila de avisos "el compañero ha hecho X" — no hay ningún primitivo de
 * toast/snackbar en components/ui, así que es un componente pequeño y
 * local, no un primitivo nuevo de diseño. */
export function CoopNoticeToast({
  notices,
  onDismiss,
}: {
  notices: CoopNotice[];
  onDismiss: (id: string) => void;
}) {
  if (notices.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex flex-col items-center gap-2 px-4"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 1rem)" }}
    >
      {notices.map((notice) => (
        <Toast key={notice.id} notice={notice} onDismiss={() => onDismiss(notice.id)} />
      ))}
    </div>
  );
}

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDurationShort } from "@/core/domain/duration";
import type { Session } from "@/core/domain/session";

/** Aviso destacado en Inicio de que hay una sesión sin terminar — antes solo
 * aparecía mezclada abajo, en la lista de últimas sesiones, junto a las ya
 * terminadas; así queda a mano, arriba, nada más entrar. */
export async function ActiveSessionCard({ session }: { session: Session }) {
  const t = await getTranslations("Home.activeSession");
  const activeBlock = session.blocks.find((block) => block.status === "active") ?? session.blocks[0];

  return (
    <Card className="ring-primary/30 bg-primary/5">
      <CardContent className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3 shrink-0" aria-hidden>
            <span className="bg-primary motion-safe:animate-ping absolute inline-flex size-full rounded-full opacity-75" />
            <span className="bg-primary relative inline-flex size-3 rounded-full" />
          </span>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">{t("title")}</span>
            {activeBlock && (
              <span className="text-muted-foreground text-sm">
                {activeBlock.name} · {formatDurationShort(session.plannedDurationSeconds)}
              </span>
            )}
          </div>
        </div>
        <Button size="sm" render={<Link href={`/session/${session.id}`} />} nativeButton={false}>
          <Play className="size-4" />
          {t("resume")}
        </Button>
      </CardContent>
    </Card>
  );
}

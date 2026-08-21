"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Rss, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  getMySessionShare,
  shareSessionToFeed,
  unshareFromFeed,
} from "@/features/feed/application/actions";

type StoryBlock = { id: string; name: string; color: string; actualDurationSeconds: number };

const MAX_TITLE_LENGTH = 100;

/** Publica (o quita) la sesión en el Feed de amigos — a diferencia de
 * ShareSessionButton (enlace público para cualquiera), esto solo lo ven los
 * amigos aceptados dentro de la propia app. Igual que CreateStoryOverlay,
 * comprueba el estado real al montar en vez de asumir "sin compartir": si
 * se recarga la pantalla de resumen tras haber compartido, tiene que
 * seguir mostrando "Quitar del feed", no "Compartir" otra vez. */
export function ShareToFeedButton({
  sessionId,
  blocks,
}: {
  sessionId: string;
  blocks: StoryBlock[];
}) {
  const t = useTranslations("Feed");
  const [shareId, setShareId] = useState<string | null | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    void getMySessionShare(sessionId)
      .then((share) => setShareId(share?.id ?? null))
      .catch(() => setShareId(null));
  }, [sessionId]);

  function handleShare() {
    startTransition(async () => {
      const share = await shareSessionToFeed(sessionId, blocks, title.trim() || null);
      setShareId(share.id);
      setDialogOpen(false);
    });
  }

  function handleUnshare() {
    if (!shareId) return;
    startTransition(async () => {
      await unshareFromFeed(shareId);
      setShareId(null);
    });
  }

  // undefined = todavía comprobando si ya está compartida — no se muestra
  // nada hasta saberlo, para no parpadear de un estado al otro.
  if (shareId === undefined) return null;

  if (shareId) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={handleUnshare} disabled={isPending}>
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        {isPending ? t("unsharing") : t("unshare")}
      </Button>
    );
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
        <Rss className="size-4" />
        {t("shareToFeed")}
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("shareDialogTitle")}</DialogTitle>
            <DialogDescription>{t("shareDialogDescription")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="feed-share-title">{t("titleLabel")}</Label>
            <Input
              id="feed-share-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={MAX_TITLE_LENGTH}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" onClick={handleShare} disabled={isPending}>
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? t("sharing") : t("shareToFeed")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

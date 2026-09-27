"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Ban, CheckCircle2, Ellipsis, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { blockUser, reportUser } from "@/features/moderation/application/actions";
import {
  REPORT_DETAILS_MAX_LENGTH,
  REPORT_REASONS,
  type ReportContext,
  type ReportReason,
} from "@/features/moderation/application/constants";

export interface SafetyTarget {
  ownerId: string;
  username: string;
}

export type SafetyAction = "report" | "block";

/** El botón "⋯" con Denunciar / Bloquear. Solo el menú: qué pasa al elegir
 * cada opción lo decide quien lo usa (un diálogo propio con
 * UserSafetyControls, o cambiar la vista de un diálogo que ya está abierto,
 * como en la ficha de un amigo — base-ui no se lleva bien con diálogos
 * anidados, ver AvatarLightbox). */
export function UserSafetyMenu({
  username,
  onSelect,
  className,
}: {
  username: string;
  onSelect: (action: SafetyAction) => void;
  className?: string;
}) {
  const t = useTranslations("Moderation");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("menuLabel", { name: username })}
            className={cn("text-muted-foreground", className)}
          />
        }
      >
        <Ellipsis className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuItem onClick={() => onSelect("report")}>
          <Flag />
          {t("report")}
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={() => onSelect("block")}>
          <Ban />
          {t("block")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Formulario de denuncia, pensado para ir DENTRO de un <Dialog> ya abierto
 * (usa su cabecera y su pie). Al terminar muestra el agradecimiento en el
 * mismo sitio; `onFinished` se llama al cerrarlo, diciendo si además se
 * bloqueó — así quien lo usa puede quitar a esa persona de la pantalla sin
 * que el diálogo desaparezca de golpe antes de poder leerlo.
 */
export function ReportUserPanel({
  target,
  context,
  contentId,
  onSent,
  onFinished,
  onCancel,
}: {
  target: SafetyTarget;
  context: ReportContext;
  contentId?: string | null;
  /** En cuanto se ha enviado (antes del agradecimiento) — por si el
   * diálogo se cierra con la X en vez de con el botón de cerrar. */
  onSent?: (result: { blocked: boolean }) => void;
  onFinished: (result: { blocked: boolean }) => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Moderation");
  const formId = useId();
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ blocked: boolean } | null>(null);
  const [isPending, startTransition] = useTransition();
  const isPost = context === "session_share" || context === "weekly_goal_share";

  function handleSubmit() {
    if (!reason) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await reportUser({
          reportedOwnerId: target.ownerId,
          reason,
          context,
          contentId: contentId ?? null,
          details,
          alsoBlock,
        });
        if (result.ok) {
          setSent({ blocked: alsoBlock });
          onSent?.({ blocked: alsoBlock });
        } else setError(t(`errors.${result.error}`));
      } catch {
        setError(t("errors.generic"));
      }
    });
  }

  if (sent) {
    return (
      <>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="text-primary size-5" aria-hidden />
            {t("sentTitle")}
          </DialogTitle>
          <DialogDescription>{t("sentBody")}</DialogDescription>
        </DialogHeader>
        {sent.blocked && (
          <p className="text-muted-foreground text-sm">
            {t("sentBlocked", { name: target.username })}
          </p>
        )}
        <DialogFooter>
          <Button type="button" onClick={() => onFinished(sent)}>
            {t("close")}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isPost ? t("reportPostTitle") : t("reportTitle", { name: target.username })}
        </DialogTitle>
        <DialogDescription>{t("reportDescription", { name: target.username })}</DialogDescription>
      </DialogHeader>

      <fieldset className="flex flex-col gap-1.5" disabled={isPending}>
        <legend className="mb-1.5 text-sm font-medium">{t("reasonLabel")}</legend>
        {REPORT_REASONS.map((value) => (
          <label
            key={value}
            className="border-border has-checked:border-primary has-checked:bg-primary/5 hover:bg-muted flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors"
          >
            <input
              type="radio"
              name={`${formId}-reason`}
              value={value}
              checked={reason === value}
              onChange={() => setReason(value)}
              className="accent-primary size-4 shrink-0"
            />
            {t(`reasons.${value}`)}
          </label>
        ))}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${formId}-details`}>{t("detailsLabel")}</Label>
        <Textarea
          id={`${formId}-details`}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          placeholder={t("detailsPlaceholder")}
          maxLength={REPORT_DETAILS_MAX_LENGTH}
          rows={3}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`${formId}-block`}
          checked={alsoBlock}
          onCheckedChange={setAlsoBlock}
          disabled={isPending}
        />
        <label htmlFor={`${formId}-block`} className="text-sm select-none">
          {t("alsoBlock", { name: target.username })}
        </label>
      </div>

      {error && <p className="text-destructive text-sm">{error}</p>}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {t("cancel")}
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={!reason || isPending}>
          <Flag />
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Confirmación de bloqueo — igual que ReportUserPanel, va dentro de un
 * <Dialog> ya abierto. */
export function BlockUserPanel({
  target,
  onBlocked,
  onCancel,
}: {
  target: SafetyTarget;
  onBlocked: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("Moderation");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      try {
        await blockUser(target.ownerId);
        onBlocked();
      } catch {
        setError(t("blockError"));
      }
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("blockTitle", { name: target.username })}</DialogTitle>
        <DialogDescription>{t("blockDescription")}</DialogDescription>
      </DialogHeader>
      <ul className="text-muted-foreground flex list-disc flex-col gap-1.5 pl-5 text-sm">
        <li>{t("blockEffects.friendship")}</li>
        <li>{t("blockEffects.contact")}</li>
        <li>{t("blockEffects.groups")}</li>
        <li>{t("blockEffects.undo")}</li>
      </ul>
      {error && <p className="text-destructive text-sm">{error}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {t("cancel")}
        </Button>
        <Button type="button" variant="destructive" onClick={handleConfirm} disabled={isPending}>
          <Ban />
          {isPending ? t("blocking") : t("blockConfirm")}
        </Button>
      </DialogFooter>
    </>
  );
}

/** Menú "⋯" + su propio diálogo — para sitios donde no hay ya un diálogo
 * abierto (Feed, solicitudes pendientes, miembros de un grupo). */
export function UserSafetyControls({
  target,
  context,
  contentId,
  onBlocked,
  className,
}: {
  target: SafetyTarget;
  context: ReportContext;
  contentId?: string | null;
  /** Se llama cuando el bloqueo ya está hecho y el diálogo cerrado. */
  onBlocked?: () => void;
  className?: string;
}) {
  const [action, setAction] = useState<SafetyAction | null>(null);
  // La clave cambia con cada apertura para que el formulario empiece vacío
  // (el diálogo mantiene montado su contenido mientras se cierra).
  const [openCount, setOpenCount] = useState(0);
  const blockedRef = useRef(false);

  function open(next: SafetyAction) {
    blockedRef.current = false;
    setOpenCount((count) => count + 1);
    setAction(next);
  }

  function close() {
    setAction(null);
    if (blockedRef.current) onBlocked?.();
    blockedRef.current = false;
  }

  function markBlocked(blocked: boolean) {
    if (blocked) blockedRef.current = true;
  }

  return (
    <>
      <UserSafetyMenu username={target.username} onSelect={open} className={className} />
      <Dialog open={action !== null} onOpenChange={(next) => !next && close()}>
        <DialogContent key={openCount}>
          {action === "report" && (
            <ReportUserPanel
              target={target}
              context={context}
              contentId={contentId}
              onSent={({ blocked }) => markBlocked(blocked)}
              onFinished={close}
              onCancel={close}
            />
          )}
          {action === "block" && (
            <BlockUserPanel
              target={target}
              onBlocked={() => {
                markBlocked(true);
                close();
              }}
              onCancel={close}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

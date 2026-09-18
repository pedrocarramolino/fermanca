"use client";

import * as React from "react";
import { ViewTransition } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { XIcon } from "lucide-react";

function Dialog({ ...props }: DialogPrimitive.Root.Props) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: DialogPrimitive.Trigger.Props) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: DialogPrimitive.Portal.Props) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: DialogPrimitive.Close.Props) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({ className, ...props }: DialogPrimitive.Backdrop.Props) {
  return (
    <DialogPrimitive.Backdrop
      data-slot="dialog-overlay"
      className={cn(
        "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 isolate z-50 bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  style,
  ...props
}: DialogPrimitive.Popup.Props & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal>
      <DialogOverlay />
      {/* Un diálogo centrado que crece (p. ej. mientras le llegan los datos)
          se estira hacia arriba de golpe. Con esto, el cambio de tamaño se
          desliza en vez de saltar. `default="none"` es a propósito: solo se
          anima si quien cambia el contenido lo hace dentro de una transición
          (ver FriendSessionContent), así los demás diálogos se comportan
          exactamente igual que antes. */}
      <ViewTransition default="none" update="dialog-resize">
        <DialogPrimitive.Popup
          data-slot="dialog-content"
          className={cn(
            // Tope de altura + scroll DENTRO del diálogo. Sin esto, un diálogo
            // con mucho contenido (p. ej. tres anuncios largos) crece más que
            // la pantalla: se sale por arriba, la X de cerrar queda fuera de
            // vista y el fondo está bloqueado por el scroll lock del modal, así
            // que no hay forma de cerrarlo.
            //
            // El que hace scroll es el envoltorio de dentro, no el <Popup>: así
            // la X se queda fija en la esquina (está posicionada contra el
            // Popup, que no se mueve) en vez de irse hacia arriba al bajar. El
            // padding vive en ese envoltorio para que los pies de diálogo, que
            // sangran a los lados con -mx-4, sigan llegando justo al borde sin
            // desbordar.
            "bg-popover text-popover-foreground ring-foreground/10 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 fixed top-1/2 left-1/2 z-50 flex w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl text-sm ring-1 duration-100 outline-none sm:max-w-sm",
            "glass:bg-[color-mix(in_oklch,var(--popover)_var(--glass-alpha-light,70%),transparent)] glass:dark:bg-[color-mix(in_oklch,var(--popover)_var(--glass-alpha-dark,50%),transparent)] glass:[backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)_url(#liquid-glass-distortion)] glass:[-webkit-backdrop-filter:blur(var(--glass-blur,40px))_saturate(1.7)] glass:ring-border/60 glass:shadow-[0_8px_32px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.35)] glass:dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]",
            className,
          )}
          // El tope va aquí y no en una clase porque necesita --safe-gap
          // (ver globals.css): sin descontar la zona segura, en iOS el
          // diálogo se mete por debajo de la barra de estado y el título y
          // la X de cerrar quedan tapados.
          style={{ maxHeight: "calc(100dvh - 2 * var(--safe-gap) - 2rem)", ...style }}
          {...props}
        >
          <div data-slot="dialog-body" className="grid gap-4 overflow-x-hidden overflow-y-auto p-4">
            {children}
          </div>
          {showCloseButton && (
            <DialogPrimitive.Close
              data-slot="dialog-close"
              render={<Button variant="ghost" className="absolute top-2 right-2" size="icon-sm" />}
            >
              <XIcon />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          )}
        </DialogPrimitive.Popup>
      </ViewTransition>
    </DialogPortal>
  );
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="dialog-header" className={cn("flex flex-col gap-2", className)} {...props} />
  );
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "bg-muted/50 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t p-4 sm:flex-row sm:justify-end",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close render={<Button variant="outline" />}>Close</DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({ className, ...props }: DialogPrimitive.Title.Props) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-base leading-none font-medium", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ...props }: DialogPrimitive.Description.Props) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};

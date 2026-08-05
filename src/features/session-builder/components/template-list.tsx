"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDurationShort } from "@/core/domain/duration";
import { templateTotalDurationSeconds, type Template } from "@/core/domain/template";
import { deleteTemplate } from "@/features/session-builder/application/actions";

export function TemplateList({
  templates,
  onUse,
  onDeleted,
}: {
  templates: Template[];
  onUse: (template: Template) => void;
  onDeleted: (templateId: string) => void;
}) {
  const [isPending, startTransition] = useTransition();

  if (templates.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        Todavía no has guardado ninguna plantilla.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {templates.map((template) => (
        <li
          key={template.id}
          className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
        >
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{template.name}</span>
            <span className="text-muted-foreground text-xs">
              {template.blocks.length} bloques ·{" "}
              {formatDurationShort(templateTotalDurationSeconds(template))}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" size="sm" variant="secondary" onClick={() => onUse(template)}>
              Usar
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              aria-label={`Eliminar plantilla ${template.name}`}
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await deleteTemplate(template.id);
                  onDeleted(template.id);
                })
              }
            >
              <Trash2 className="size-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}

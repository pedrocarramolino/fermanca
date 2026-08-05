"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDurationShort } from "@/core/domain/duration";
import { templateTotalDurationSeconds, type Template } from "@/core/domain/template";
import { deleteTemplate, renameTemplate } from "@/features/session-builder/application/actions";
import { SaveTemplateDialog } from "@/features/session-builder/components/save-template-dialog";

export function TemplateList({
  templates,
  onUse,
  onDeleted,
  onRenamed,
}: {
  templates: Template[];
  onUse: (template: Template) => void;
  onDeleted: (templateId: string) => void;
  onRenamed: (template: Template) => void;
}) {
  const t = useTranslations("TemplateList");
  const [isPending, startTransition] = useTransition();
  const [renamingTemplate, setRenamingTemplate] = useState<Template | null>(null);

  async function handleRename(name: string) {
    if (!renamingTemplate) return;
    const updated = await renameTemplate(renamingTemplate.id, name);
    onRenamed(updated);
  }

  if (templates.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-2">
        {templates.map((template) => (
          <li
            key={template.id}
            className="border-border hover:bg-muted flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors"
          >
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium">{template.name}</span>
              <span className="text-muted-foreground text-xs">
                {t("blocksCount", { count: template.blocks.length })} ·{" "}
                {formatDurationShort(templateTotalDurationSeconds(template))}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button type="button" size="sm" variant="secondary" onClick={() => onUse(template)}>
                {t("use")}
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("rename", { name: template.name })}
                onClick={() => setRenamingTemplate(template)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={t("delete", { name: template.name })}
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

      <SaveTemplateDialog
        key={renamingTemplate?.id ?? "none"}
        open={renamingTemplate !== null}
        onOpenChange={(open) => {
          if (!open) setRenamingTemplate(null);
        }}
        defaultName={renamingTemplate?.name ?? ""}
        title={t("renameTitle")}
        saveLabel={t("renameSave")}
        savingLabel={t("renaming")}
        onSave={handleRename}
      />
    </>
  );
}

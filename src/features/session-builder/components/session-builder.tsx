"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationShort } from "@/core/domain/duration";
import type { Category, CustomCategory } from "@/core/domain/category";
import type { Template } from "@/core/domain/template";
import { useSessionDraft } from "@/features/session-builder/hooks/use-session-draft";
import { AddBlockForm } from "@/features/session-builder/components/add-block-form";
import { BlockList } from "@/features/session-builder/components/block-list";
import { TemplateList } from "@/features/session-builder/components/template-list";
import { SaveTemplateDialog } from "@/features/session-builder/components/save-template-dialog";
import {
  saveAsNewTemplate,
  startSession,
  updateTemplateBlocks,
} from "@/features/session-builder/application/actions";

export function SessionBuilder({
  initialCategories,
  initialTemplates,
}: {
  initialCategories: Category[];
  initialTemplates: Template[];
}) {
  const t = useTranslations("SessionBuilder");
  const [categories, setCategories] = useState(initialCategories);
  const [templates, setTemplates] = useState(initialTemplates);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [isStarting, startStarting] = useTransition();
  const [isSavingChanges, startSavingChanges] = useTransition();

  const draft = useSessionDraft();
  const loadedTemplate = templates.find((t) => t.id === draft.loadedTemplateId) ?? null;

  function handleUseTemplate(template: Template) {
    draft.loadTemplate(
      template.id,
      template.blocks.map((block) => ({
        categoryId: block.categoryId,
        name: block.name,
        durationSeconds: block.durationSeconds,
        color: block.color,
      })),
    );
  }

  function handleTemplateDeleted(templateId: string) {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (draft.loadedTemplateId === templateId) draft.clear();
  }

  function handleTemplateRenamed(updated: Template) {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  function handleCategoryUpdated(updated: CustomCategory) {
    setCategories((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleCategoryDeleted(categoryId: string) {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
  }

  async function handleSaveAsNew(name: string) {
    const template = await saveAsNewTemplate(name, draft.blocksInput);
    setTemplates((prev) => [template, ...prev]);
  }

  function handleSaveChanges() {
    if (!loadedTemplate) return;
    startSavingChanges(async () => {
      const updated = await updateTemplateBlocks(
        loadedTemplate.id,
        loadedTemplate.name,
        draft.blocksInput,
      );
      setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    });
  }

  function handleStart() {
    startStarting(async () => {
      await startSession(draft.loadedTemplateId, draft.blocksInput);
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddBlockForm
            categories={categories}
            onCategoryCreated={(category) => setCategories((prev) => [...prev, category])}
            onCategoryUpdated={handleCategoryUpdated}
            onCategoryDeleted={handleCategoryDeleted}
            onAdd={draft.addBlock}
          />

          <BlockList blocks={draft.blocks} onReorder={draft.reorder} onRemove={draft.removeBlock} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-muted-foreground text-sm">
              {t("totalDuration")}{" "}
              <span className="text-foreground font-medium">
                {formatDurationShort(draft.totalDurationSeconds)}
              </span>
            </span>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={draft.blocks.length === 0}
                onClick={() => setSaveDialogOpen(true)}
              >
                {t("saveAsTemplate")}
              </Button>
              {loadedTemplate && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSavingChanges || draft.blocks.length === 0}
                  onClick={handleSaveChanges}
                >
                  {isSavingChanges
                    ? t("saving")
                    : t("saveChangesTo", { name: loadedTemplate.name })}
                </Button>
              )}
              <Button
                type="button"
                disabled={draft.blocks.length === 0 || isStarting}
                onClick={handleStart}
              >
                {isStarting ? t("starting") : t("start")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("savedTemplates")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateList
            templates={templates}
            onUse={handleUseTemplate}
            onDeleted={handleTemplateDeleted}
            onRenamed={handleTemplateRenamed}
          />
        </CardContent>
      </Card>

      <SaveTemplateDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={handleSaveAsNew}
        title={t("saveAsTemplate")}
      />
    </div>
  );
}

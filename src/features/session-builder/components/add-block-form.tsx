"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Plus, Trash2 } from "lucide-react";
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
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CategoryDialog } from "@/features/session-builder/components/category-dialog";
import { deleteCustomCategory } from "@/features/session-builder/application/actions";
import type { Category, CustomCategory } from "@/core/domain/category";

const NEW_CATEGORY_VALUE = "__new__";
const QUICK_MINUTE_PRESETS = [10, 15, 20, 30, 60];

/** Las 4 categorías de sistema son compartidas por todos los usuarios y se
 * muestran en el idioma de quien las ve (vía su slug estable); las
 * categorías personalizadas se muestran tal cual las escribió su dueño. */
function categoryDisplayName(category: Category, t: (key: string) => string): string {
  return category.kind === "system" ? t(category.slug) : category.name;
}

export function AddBlockForm({
  categories,
  onCategoryCreated,
  onCategoryUpdated,
  onCategoryDeleted,
  onAdd,
}: {
  categories: Category[];
  onCategoryCreated: (category: CustomCategory) => void;
  onCategoryUpdated: (category: CustomCategory) => void;
  onCategoryDeleted: (categoryId: string) => void;
  onAdd: (input: {
    categoryId: string;
    name: string;
    durationSeconds: number;
    color: string;
  }) => void;
}) {
  const t = useTranslations("AddBlockForm");
  const tCategories = useTranslations("Categories");
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [name, setName] = useState(
    categories[0] ? categoryDisplayName(categories[0], tCategories) : "",
  );
  const [minutes, setMinutes] = useState(10);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CustomCategory | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<CustomCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, startDeleting] = useTransition();

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  function handleCategoryChange(value: string | null) {
    if (!value) return;
    if (value === NEW_CATEGORY_VALUE) {
      setCreateDialogOpen(true);
      return;
    }
    setCategoryId(value);
    const category = categories.find((c) => c.id === value);
    if (category) setName(categoryDisplayName(category, tCategories));
  }

  function handleCategoryCreated(category: CustomCategory) {
    onCategoryCreated(category);
    setCategoryId(category.id);
    setName(categoryDisplayName(category, tCategories));
  }

  function handleCategoryUpdated(category: CustomCategory) {
    onCategoryUpdated(category);
    if (categoryId === category.id) setName(categoryDisplayName(category, tCategories));
  }

  function handleConfirmDelete() {
    if (!deletingCategory) return;
    const deletedId = deletingCategory.id;
    startDeleting(async () => {
      setDeleteError(null);
      try {
        await deleteCustomCategory(deletedId);
        onCategoryDeleted(deletedId);
        setDeletingCategory(null);
        if (categoryId === deletedId) {
          const fallback = categories.find((c) => c.id !== deletedId) ?? null;
          setCategoryId(fallback?.id ?? "");
          setName(fallback ? categoryDisplayName(fallback, tCategories) : "");
        }
      } catch {
        setDeleteError(t("deleteError"));
      }
    });
  }

  function handleAdd() {
    const category = categories.find((c) => c.id === categoryId);
    if (!category || !name.trim() || minutes <= 0) return;
    onAdd({
      categoryId: category.id,
      name: name.trim(),
      durationSeconds: Math.round(minutes * 60),
      color: category.color,
    });
    setMinutes(10);
  }

  return (
    <div className="border-border flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <Label>{t("category")}</Label>
        <div className="flex gap-2">
          <Select value={categoryId} onValueChange={handleCategoryChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("categoryPlaceholder")}>
                {(value: string | null) => {
                  const category = categories.find((c) => c.id === value);
                  return category
                    ? categoryDisplayName(category, tCategories)
                    : t("categoryPlaceholder");
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color }}
                    aria-hidden
                  />
                  {categoryDisplayName(category, tCategories)}
                </SelectItem>
              ))}
              <SelectItem value={NEW_CATEGORY_VALUE}>
                <Plus className="size-3.5" />
                {t("newCategory")}
              </SelectItem>
            </SelectContent>
          </Select>
          {selectedCategory?.kind === "custom" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("editCategory")}
                onClick={() => setEditingCategory(selectedCategory)}
              >
                <Pencil className="size-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={t("deleteCategory")}
                onClick={() => {
                  setDeleteError(null);
                  setDeletingCategory(selectedCategory);
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="block-name">{t("blockName")}</Label>
        <Input id="block-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="flex flex-1 flex-col gap-2 sm:min-w-56">
        <Label htmlFor="block-minutes">{t("minutes")}</Label>
        <div className="flex items-center gap-3">
          <Slider
            className="flex-1"
            value={[Math.min(Math.max(minutes, 5), 120)]}
            min={5}
            max={120}
            step={5}
            onValueChange={(value) => setMinutes(Array.isArray(value) ? value[0]! : value)}
          />
          <div className="flex shrink-0 items-center gap-1.5">
            <Input
              id="block-minutes"
              type="number"
              min={1}
              className="w-16 text-center"
              value={minutes}
              onChange={(event) => setMinutes(Number(event.target.value))}
            />
            <span className="text-muted-foreground text-sm">min</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_MINUTE_PRESETS.map((preset) => (
            <Button
              key={preset}
              type="button"
              size="xs"
              variant={minutes === preset ? "default" : "outline"}
              onClick={() => setMinutes(preset)}
            >
              {preset} min
            </Button>
          ))}
        </div>
      </div>

      <Button type="button" onClick={handleAdd} disabled={!categoryId || !name.trim()}>
        <Plus className="size-4" />
        {t("add")}
      </Button>

      <CategoryDialog
        key={editingCategory?.id ?? "new"}
        open={createDialogOpen || editingCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreateDialogOpen(false);
            setEditingCategory(null);
          }
        }}
        category={editingCategory}
        onSaved={editingCategory ? handleCategoryUpdated : handleCategoryCreated}
      />

      <Dialog
        open={deletingCategory !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingCategory(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle", { name: deletingCategory?.name ?? "" })}</DialogTitle>
            <DialogDescription>
              {deleteError ?? t("deleteConfirmDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
            >
              {isDeleting ? t("deleting") : t("deleteConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

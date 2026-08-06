"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { NewCategoryDialog } from "@/features/session-builder/components/new-category-dialog";
import type { Category } from "@/core/domain/category";

const NEW_CATEGORY_VALUE = "__new__";

/** Las 4 categorías de sistema son compartidas por todos los usuarios y se
 * muestran en el idioma de quien las ve (vía su slug estable); las
 * categorías personalizadas se muestran tal cual las escribió su dueño. */
function categoryDisplayName(category: Category, t: (key: string) => string): string {
  return category.kind === "system" ? t(category.slug) : category.name;
}

export function AddBlockForm({
  categories,
  onCategoryCreated,
  onAdd,
}: {
  categories: Category[];
  onCategoryCreated: (category: Category) => void;
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
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleCategoryChange(value: string | null) {
    if (!value) return;
    if (value === NEW_CATEGORY_VALUE) {
      setDialogOpen(true);
      return;
    }
    setCategoryId(value);
    const category = categories.find((c) => c.id === value);
    if (category) setName(categoryDisplayName(category, tCategories));
  }

  function handleCategoryCreated(category: Category) {
    onCategoryCreated(category);
    setCategoryId(category.id);
    setName(categoryDisplayName(category, tCategories));
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
        <Select value={categoryId} onValueChange={handleCategoryChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t("categoryPlaceholder")}>
              {(value: string | null) => {
                const category = categories.find((c) => c.id === value);
                return category ? categoryDisplayName(category, tCategories) : t("categoryPlaceholder");
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
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <Label htmlFor="block-name">{t("blockName")}</Label>
        <Input id="block-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-40">
        <Label htmlFor="block-minutes">
          {t("minutes")}: {minutes} min
        </Label>
        <Slider
          id="block-minutes"
          value={[minutes]}
          min={5}
          max={120}
          step={5}
          onValueChange={(value) => setMinutes(Array.isArray(value) ? value[0]! : value)}
        />
      </div>

      <Button type="button" onClick={handleAdd} disabled={!categoryId || !name.trim()}>
        <Plus className="size-4" />
        {t("add")}
      </Button>

      <NewCategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCategoryCreated}
      />
    </div>
  );
}

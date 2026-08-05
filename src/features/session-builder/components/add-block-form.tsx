"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [categoryId, setCategoryId] = useState<string>(categories[0]?.id ?? "");
  const [name, setName] = useState(categories[0]?.name ?? "");
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
    if (category) setName(category.name);
  }

  function handleCategoryCreated(category: Category) {
    onCategoryCreated(category);
    setCategoryId(category.id);
    setName(category.name);
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
              {(value: string | null) =>
                categories.find((category) => category.id === value)?.name ??
                t("categoryPlaceholder")
              }
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
                {category.name}
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

      <div className="flex flex-col gap-2">
        <Label htmlFor="block-minutes">{t("minutes")}</Label>
        <Input
          id="block-minutes"
          type="number"
          min={1}
          className="w-20"
          value={minutes}
          onChange={(event) => setMinutes(Number(event.target.value))}
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

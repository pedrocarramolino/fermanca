"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
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
import { listSessionCategories } from "@/features/session-timer/application/actions";
import type { Category, CustomCategory } from "@/core/domain/category";

const NEW_CATEGORY_VALUE = "__new__";
const QUICK_MINUTE_PRESETS = [5, 10, 15, 20, 30];

/** Las 4 categorías de sistema se muestran en el idioma de quien las ve (vía
 * su slug estable); las personalizadas, tal cual las escribió su dueño —
 * mismo criterio que AddBlockForm. */
function categoryDisplayName(category: Category, t: (key: string) => string): string {
  return category.kind === "system" ? t(category.slug) : category.name;
}

/**
 * Botón + diálogo para añadir una fase nueva a mitad de sesión, desde la
 * pantalla de fin de fase (ver PhaseCompleteCard). Igual que AddBlockForm en
 * la pantalla de inicio: la fase nueva se añade siempre al final de la cola,
 * y es RemainingPhasesList (la lista arrastrable de al lado) la que deja
 * colocarla donde haga falta después — no hay que elegir la posición aquí.
 */
export function AddPhaseButton({
  onAdd,
}: {
  onAdd: (input: {
    categoryId: string;
    name: string;
    color: string;
    plannedDurationSeconds: number;
    beforeBlockId: string | null;
  }) => Promise<void>;
}) {
  const t = useTranslations("AddPhase");
  const tCategories = useTranslations("Categories");
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [name, setName] = useState("");
  const [minutes, setMinutes] = useState(10);
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCategory = categories?.find((c) => c.id === categoryId) ?? null;

  function handleOpen() {
    setOpen(true);
    if (categories === null) {
      void listSessionCategories().then((result) => {
        setCategories(result);
        if (result[0]) {
          setCategoryId(result[0].id);
          setName(categoryDisplayName(result[0], tCategories));
        }
      });
    }
  }

  function handleCategoryChange(value: string | null) {
    if (!value) return;
    if (value === NEW_CATEGORY_VALUE) {
      setCreateCategoryOpen(true);
      return;
    }
    setCategoryId(value);
    const category = categories?.find((c) => c.id === value);
    if (category) setName(categoryDisplayName(category, tCategories));
  }

  function handleCategoryCreated(category: CustomCategory) {
    setCategories((prev) => (prev ? [...prev, category] : [category]));
    setCategoryId(category.id);
    setName(category.name);
  }

  async function handleAdd() {
    if (!selectedCategory || !name.trim() || minutes <= 0) return;
    setIsSaving(true);
    setError(null);
    try {
      await onAdd({
        categoryId: selectedCategory.id,
        name: name.trim(),
        color: selectedCategory.color,
        plannedDurationSeconds: Math.round(minutes * 60),
        beforeBlockId: null,
      });
      setOpen(false);
      setMinutes(10);
    } catch {
      setError(t("addError"));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleOpen}>
        <Plus className="size-4" />
        {t("trigger")}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </DialogHeader>

          {categories === null ? (
            <p className="text-muted-foreground text-sm">{t("loading")}</p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>{t("category")}</Label>
                <Select value={categoryId} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue>
                      {selectedCategory
                        ? categoryDisplayName(selectedCategory, tCategories)
                        : t("categoryPlaceholder")}
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

              <div className="flex flex-col gap-2">
                <Label htmlFor="phase-name">{t("phaseName")}</Label>
                <Input
                  id="phase-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="phase-minutes">{t("minutes")}</Label>
                <div className="flex items-center gap-3">
                  <Slider
                    className="flex-1"
                    aria-label={t("minutes")}
                    value={[Math.min(Math.max(minutes, 5), 120)]}
                    min={5}
                    max={120}
                    step={5}
                    onValueChange={(value) => setMinutes(Array.isArray(value) ? value[0]! : value)}
                  />
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Input
                      id="phase-minutes"
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

              {error && <p className="text-destructive text-sm">{error}</p>}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              onClick={handleAdd}
              disabled={isSaving || !categoryId || !name.trim() || categories === null}
            >
              {isSaving ? t("adding") : t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryDialog
        open={createCategoryOpen}
        onOpenChange={setCreateCategoryOpen}
        onSaved={handleCategoryCreated}
      />
    </>
  );
}

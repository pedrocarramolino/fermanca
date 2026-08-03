import type { CategoryId, UserId } from "@/core/domain/ids";

/** Slugs estables de las 4 categorías fijas (coinciden con la seed en supabase/migrations). */
export const SYSTEM_CATEGORY_SLUGS = ["warmup", "flexibility", "technique", "repertoire"] as const;

export type SystemCategorySlug = (typeof SYSTEM_CATEGORY_SLUGS)[number];

export type Category = SystemCategory | CustomCategory;

export interface SystemCategory {
  kind: "system";
  id: CategoryId;
  slug: SystemCategorySlug;
  name: string;
  /** Color decorativo (oklch), no se usa como color de texto. */
  color: string;
}

export interface CustomCategory {
  kind: "custom";
  id: CategoryId;
  ownerId: UserId;
  name: string;
  color: string;
  createdAt: Date;
}

import type { Category, CustomCategory } from "@/core/domain/category";
import type { CategoryId, UserId } from "@/core/domain/ids";

export interface CategoryRepository {
  /** Categorías del sistema + personalizadas del usuario. */
  listAvailable(ownerId: UserId): Promise<Category[]>;
  createCustom(input: { ownerId: UserId; name: string; color: string }): Promise<CustomCategory>;
  updateCustom(
    id: CategoryId,
    ownerId: UserId,
    changes: Partial<Pick<CustomCategory, "name" | "color">>,
  ): Promise<CustomCategory>;
  deleteCustom(id: CategoryId, ownerId: UserId): Promise<void>;
}

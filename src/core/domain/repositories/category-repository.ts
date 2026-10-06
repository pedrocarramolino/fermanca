import type { Category, CustomCategory } from "@/core/domain/category";
import type { CategoryId, UserId } from "@/core/domain/ids";

export interface CategoryRepository {
  /** Categorías del sistema + personalizadas del usuario. */
  listAvailable(ownerId: UserId): Promise<Category[]>;
  createCustom(input: {
    ownerId: UserId;
    name: string;
    color: string;
    isGhost: boolean;
  }): Promise<CustomCategory>;
  updateCustom(
    id: CategoryId,
    ownerId: UserId,
    changes: Partial<Pick<CustomCategory, "name" | "color" | "isGhost">>,
  ): Promise<CustomCategory>;
  /** "inUse": todavía la usa alguna plantilla o sesión del historial (las
   * claves externas lo impiden), así que no se borra. */
  deleteCustom(id: CategoryId, ownerId: UserId): Promise<"deleted" | "inUse">;
}

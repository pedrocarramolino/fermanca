"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseCategoryRepository } from "@/core/infrastructure/supabase/repositories/category-repository";
import { SupabaseTemplateRepository } from "@/core/infrastructure/supabase/repositories/template-repository";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import type { CategoryId, TemplateId, UserId } from "@/core/domain/ids";
import { UnauthorizedError } from "@/core/domain/errors";
import {
  toNewSessionBlocks,
  toNewTemplateBlocks,
  type DraftBlockInput,
} from "@/features/session-builder/application/draft-block";

export type { DraftBlockInput };

async function requireUserId(): Promise<{
  userId: UserId;
  client: Awaited<ReturnType<typeof createClient>>;
}> {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

export async function createCustomCategory(name: string, color: string, isGhost: boolean) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseCategoryRepository(client);
  const category = await repo.createCustom({ ownerId: userId, name, color, isGhost });
  revalidatePath("/");
  return category;
}

export async function updateCustomCategory(
  id: string,
  name: string,
  color: string,
  isGhost: boolean,
) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseCategoryRepository(client);
  const category = await repo.updateCustom(id as CategoryId, userId, { name, color, isGhost });
  revalidatePath("/");
  return category;
}

export async function deleteCustomCategory(id: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseCategoryRepository(client);
  await repo.deleteCustom(id as CategoryId, userId);
  revalidatePath("/");
}

export async function saveAsNewTemplate(name: string, blocks: DraftBlockInput[]) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseTemplateRepository(client);
  const template = await repo.create({
    ownerId: userId,
    name,
    blocks: toNewTemplateBlocks(blocks),
  });
  revalidatePath("/");
  return template;
}

export async function updateTemplateBlocks(
  templateId: string,
  name: string,
  blocks: DraftBlockInput[],
) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseTemplateRepository(client);
  const template = await repo.update(templateId as TemplateId, userId, {
    name,
    blocks: toNewTemplateBlocks(blocks),
  });
  revalidatePath("/");
  return template;
}

export async function renameTemplate(id: string, name: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseTemplateRepository(client);
  const template = await repo.update(id as TemplateId, userId, { name });
  revalidatePath("/");
  return template;
}

export async function deleteTemplate(id: string) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseTemplateRepository(client);
  await repo.delete(id as TemplateId, userId);
  revalidatePath("/");
}

export async function startSession(templateId: string | null, blocks: DraftBlockInput[]) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseSessionRepository(client);
  const plannedDurationSeconds = blocks.reduce((total, b) => total + b.durationSeconds, 0);
  const session = await repo.start({
    ownerId: userId,
    templateId: templateId as TemplateId | null,
    plannedDurationSeconds,
    blocks: toNewSessionBlocks(blocks),
  });
  redirect(`/session/${session.id}`);
}

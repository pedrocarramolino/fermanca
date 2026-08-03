"use server";

import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseSessionRepository } from "@/core/infrastructure/supabase/repositories/session-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import type { UserId } from "@/core/domain/ids";
import { HISTORY_PAGE_SIZE } from "@/features/history/application/constants";

export async function loadMoreSessions(offset: number) {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) throw new UnauthorizedError();

  const repo = new SupabaseSessionRepository(client);
  return repo.listByOwner(userId as UserId, { limit: HISTORY_PAGE_SIZE, offset });
}

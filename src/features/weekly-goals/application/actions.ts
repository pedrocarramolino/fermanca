"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/core/infrastructure/supabase/server";
import { SupabaseWeeklyGoalRepository } from "@/core/infrastructure/supabase/repositories/weekly-goal-repository";
import { UnauthorizedError } from "@/core/domain/errors";
import { currentWeekStartKey } from "@/core/domain/weekly-goal";
import type { UserId, WeeklyGoalId } from "@/core/domain/ids";

async function requireUserId() {
  const client = await createClient();
  const { data } = await client.auth.getClaims();
  const sub = data?.claims.sub;
  if (!sub) throw new UnauthorizedError();
  return { userId: sub as UserId, client };
}

export async function saveWeeklyGoal(targetDays: number, targetHours: number) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseWeeklyGoalRepository(client);
  const goal = await repo.upsert(userId, {
    weekStart: currentWeekStartKey(new Date()),
    targetDays,
    targetSeconds: Math.round(targetHours * 3600),
  });

  revalidatePath("/");
  return goal;
}

export async function setWeeklyGoalCompleted(id: string, completed: boolean) {
  const { userId, client } = await requireUserId();
  const repo = new SupabaseWeeklyGoalRepository(client);
  const goal = await repo.setCompleted(id as WeeklyGoalId, userId, completed);

  revalidatePath("/");
  return goal;
}

import type { SupabaseClient } from "@supabase/supabase-js";
import type { PushSubscription } from "@/core/domain/push-subscription";
import type { PushSubscriptionRepository } from "@/core/domain/repositories/push-subscription-repository";
import type { Database } from "@/core/infrastructure/supabase/database.types";
import type { UserId } from "@/core/domain/ids";

export class SupabasePushSubscriptionRepository implements PushSubscriptionRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async save(subscription: PushSubscription): Promise<void> {
    const { error } = await this.client.from("push_subscriptions").upsert(
      {
        owner_id: subscription.ownerId,
        endpoint: subscription.endpoint,
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw error;
  }

  async deleteByEndpoint(endpoint: string): Promise<void> {
    const { error } = await this.client
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint);
    if (error) throw error;
  }

  async listByOwner(ownerId: UserId): Promise<PushSubscription[]> {
    const { data, error } = await this.client
      .from("push_subscriptions")
      .select("*")
      .eq("owner_id", ownerId);
    if (error) throw error;
    return data.map((row) => ({
      ownerId: row.owner_id as UserId,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
    }));
  }
}

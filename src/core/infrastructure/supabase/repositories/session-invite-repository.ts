import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  InviteDraftBlock,
  SessionInvite,
  SessionInviteStatus,
} from "@/core/domain/session-invite";
import type { SessionId, SessionInviteId, TemplateId, UserId } from "@/core/domain/ids";
import type { SessionInviteRepository } from "@/core/domain/repositories/session-invite-repository";
import type { Database, Json } from "@/core/infrastructure/supabase/database.types";
import { assertUuid } from "@/lib/uuid";

type Row = Database["public"]["Tables"]["session_invites"]["Row"];

function toDomain(row: Row): SessionInvite {
  return {
    id: row.id as SessionInviteId,
    inviterId: row.inviter_id as UserId,
    inviteeId: row.invitee_id as UserId,
    templateId: row.template_id as TemplateId | null,
    blocks: row.blocks as unknown as InviteDraftBlock[],
    status: row.status as SessionInviteStatus,
    inviterSessionId: row.inviter_session_id as SessionId | null,
    inviteeSessionId: row.invitee_session_id as SessionId | null,
    createdAt: new Date(row.created_at),
    respondedAt: row.responded_at ? new Date(row.responded_at) : null,
  };
}

export class SupabaseSessionInviteRepository implements SessionInviteRepository {
  constructor(private readonly client: SupabaseClient<Database>) {}

  async create(input: {
    inviterId: UserId;
    inviteeId: UserId;
    templateId: TemplateId | null;
    blocks: InviteDraftBlock[];
  }): Promise<SessionInvite> {
    const { data, error } = await this.client
      .from("session_invites")
      .insert({
        inviter_id: input.inviterId,
        invitee_id: input.inviteeId,
        template_id: input.templateId,
        blocks: input.blocks as unknown as Json,
      })
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async getById(id: SessionInviteId, userId: UserId): Promise<SessionInvite | null> {
    assertUuid(userId);
    const { data, error } = await this.client
      .from("session_invites")
      .select("*")
      .eq("id", id)
      .or(`inviter_id.eq.${userId},invitee_id.eq.${userId}`)
      .maybeSingle();
    if (error) throw error;
    return data ? toDomain(data) : null;
  }

  async listIncomingPending(inviteeId: UserId): Promise<SessionInvite[]> {
    const { data, error } = await this.client
      .from("session_invites")
      .select("*")
      .eq("invitee_id", inviteeId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data.map(toDomain);
  }

  async decline(id: SessionInviteId, inviteeId: UserId): Promise<SessionInvite> {
    const { data, error } = await this.client
      .from("session_invites")
      .update({ status: "declined", responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("invitee_id", inviteeId)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async cancel(id: SessionInviteId, inviterId: UserId): Promise<SessionInvite> {
    const { data, error } = await this.client
      .from("session_invites")
      .update({ status: "cancelled", responded_at: new Date().toISOString() })
      .eq("id", id)
      .eq("inviter_id", inviterId)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }

  async markAccepted(
    id: SessionInviteId,
    inviteeId: UserId,
    sessionIds: { inviterSessionId: SessionId; inviteeSessionId: SessionId },
  ): Promise<SessionInvite> {
    const { data, error } = await this.client
      .from("session_invites")
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        inviter_session_id: sessionIds.inviterSessionId,
        invitee_session_id: sessionIds.inviteeSessionId,
      })
      .eq("id", id)
      .eq("invitee_id", inviteeId)
      .select("*")
      .single();
    if (error) throw error;
    return toDomain(data);
  }
}

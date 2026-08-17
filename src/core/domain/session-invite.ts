import type { SessionId, SessionInviteId, TemplateId, UserId } from "@/core/domain/ids";

export type SessionInviteStatus = "pending" | "accepted" | "declined" | "cancelled";

/** Mismo shape que DraftBlockInput del session-builder, pero como tipo
 * propio de core/domain — este módulo no importa desde features/. */
export interface InviteDraftBlock {
  categoryId: string;
  name: string;
  color: string;
  durationSeconds: number;
  position: number;
}

export interface SessionInvite {
  id: SessionInviteId;
  inviterId: UserId;
  inviteeId: UserId;
  templateId: TemplateId | null;
  blocks: InviteDraftBlock[];
  status: SessionInviteStatus;
  inviterSessionId: SessionId | null;
  inviteeSessionId: SessionId | null;
  createdAt: Date;
  respondedAt: Date | null;
}

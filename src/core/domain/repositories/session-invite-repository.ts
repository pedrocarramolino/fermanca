import type { InviteDraftBlock, SessionInvite } from "@/core/domain/session-invite";
import type { SessionId, SessionInviteId, TemplateId, UserId } from "@/core/domain/ids";

export interface SessionInviteRepository {
  create(input: {
    inviterId: UserId;
    inviteeId: UserId;
    templateId: TemplateId | null;
    blocks: InviteDraftBlock[];
  }): Promise<SessionInvite>;
  /** Por cualquiera de las dos partes — el que invita la usa para la
   * pantalla de espera, el invitado para aceptar/rechazar. */
  getById(id: SessionInviteId, userId: UserId): Promise<SessionInvite | null>;
  listIncomingPending(inviteeId: UserId): Promise<SessionInvite[]>;
  decline(id: SessionInviteId, inviteeId: UserId): Promise<SessionInvite>;
  cancel(id: SessionInviteId, inviterId: UserId): Promise<SessionInvite>;
  markAccepted(
    id: SessionInviteId,
    inviteeId: UserId,
    sessionIds: { inviterSessionId: SessionId; inviteeSessionId: SessionId },
  ): Promise<SessionInvite>;
}

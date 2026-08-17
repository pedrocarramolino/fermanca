import { notFound, redirect } from "next/navigation";
import { getAuthenticatedUser } from "@/core/infrastructure/supabase/current-user";
import { SupabaseSessionInviteRepository } from "@/core/infrastructure/supabase/repositories/session-invite-repository";
import { SupabaseProfileRepository } from "@/core/infrastructure/supabase/repositories/profile-repository";
import type { SessionInviteId } from "@/core/domain/ids";
import { InviteWaitingScreen } from "@/features/session-invites/components/invite-waiting-screen";

export default async function SessionInvitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, userId } = await getAuthenticatedUser();

  const invite = await new SupabaseSessionInviteRepository(supabase).getById(
    id as SessionInviteId,
    userId,
  );
  if (!invite || invite.inviterId !== userId) notFound();

  if (invite.status === "accepted" && invite.inviterSessionId) {
    redirect(`/session/${invite.inviterSessionId}`);
  }

  // Ya son amigos aceptados (se exige al crear la invitación), así que la
  // RLS de profiles ("own_or_friend") deja leer el perfil del invitado.
  const friendProfile = await new SupabaseProfileRepository(supabase).getByOwnerId(
    invite.inviteeId,
  );

  return (
    <InviteWaitingScreen
      inviteId={invite.id}
      initialStatus={invite.status}
      friendUsername={friendProfile?.username ?? ""}
    />
  );
}

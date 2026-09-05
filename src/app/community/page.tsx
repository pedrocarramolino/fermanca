import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getMyProfile,
  listFriendsWithProgress,
  listPendingRequests,
  listSuggestedFriends,
} from "@/features/community/application/actions";
import { listAnnouncements } from "@/features/community/application/announcement-actions";
import { listIncomingPendingSessionInvites } from "@/features/session-invites/application/actions";
import { CommunityManager } from "@/features/community/components/community-manager";
import { AnnouncementBoard } from "@/features/community/components/announcement-board";
import { SuggestedFriendsList } from "@/features/community/components/suggested-friends-list";
import { PendingSessionInvitesList } from "@/features/session-invites/components/pending-session-invites-list";

const WHATSAPP_COMMUNITY_URL = "https://whatsapp.com/channel/0029VbEHCgA9cDDhpNVcWk0M";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Community");
  return { title: t("title") };
}

export default async function CommunityPage() {
  const t = await getTranslations("Community.whatsapp");
  const [
    profile,
    pendingRequests,
    friendsWithProgress,
    announcements,
    pendingSessionInvites,
    suggestedFriends,
  ] = await Promise.all([
    getMyProfile(),
    listPendingRequests(),
    listFriendsWithProgress(),
    listAnnouncements(),
    listIncomingPendingSessionInvites(),
    listSuggestedFriends(),
  ]);

  // CommunityManager guarda estas listas en su propio estado local (para
  // las actualizaciones optimistas al aceptar/quitar) — solo las relee al
  // MONTARSE, no en cada re-render con props nuevas. Esta key cambia en
  // cuanto cambia el conjunto de solicitudes o amigos, así que un
  // router.refresh() tras aceptar/borrar fuerza un remontado limpio con los
  // datos ya frescos del servidor en vez de quedarse con el estado viejo.
  const dataKey = [
    ...pendingRequests.map((r) => r.friendshipId),
    ...friendsWithProgress.map((f) => f.friendshipId),
  ].join(",");

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <AppHeader />
      <CommunityManager
        key={dataKey}
        inviteCode={profile.inviteCode}
        initialPendingRequests={pendingRequests}
        initialFriends={friendsWithProgress}
      />

      <SuggestedFriendsList suggestions={suggestedFriends} />

      <PendingSessionInvitesList initialInvites={pendingSessionInvites} />

      <AnnouncementBoard
        initialAnnouncements={announcements.map((a) => ({
          id: a.id,
          authorUsername: a.authorUsername,
          body: a.body,
          createdAt: a.createdAt.toISOString(),
        }))}
        isAdmin={profile.isAdmin}
        viewAllHref="/community/announcements"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("title")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-muted-foreground text-sm">{t("description")}</p>
          <Button
            render={<a href={WHATSAPP_COMMUNITY_URL} target="_blank" rel="noopener noreferrer" />}
            nativeButton={false}
            variant="outline"
            className="self-start"
          >
            <WhatsAppIcon className="size-4" />
            {t("cta")}
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  countMyFriends,
  getMyProfile,
  listPendingRequests,
  listSuggestedFriends,
} from "@/features/community/application/actions";
import { listIncomingPendingSessionInvites } from "@/features/session-invites/application/actions";
import { countMyGroups } from "@/features/groups/application/actions";
import { CommunityManager } from "@/features/community/components/community-manager";
import { SuggestedFriendsList } from "@/features/community/components/suggested-friends-list";
import { PendingSessionInvitesList } from "@/features/session-invites/components/pending-session-invites-list";

const WHATSAPP_COMMUNITY_URL = "https://whatsapp.com/channel/0029VbEHCgA9cDDhpNVcWk0M";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Community");
  return { title: t("title") };
}

/** Los dos apartados de abajo no hacen falta para pintar la pantalla: se
 * mandan en streaming cuando estén listos (y los dos se pintan solos como
 * nada si vienen vacíos, así que no necesitan hueco reservado mientras
 * tanto). Las sugerencias, sobre todo, recorren las amistades de todos tus
 * amigos — no tiene sentido que retrasen el código de invitación. */
async function SuggestedFriendsSection() {
  return <SuggestedFriendsList suggestions={await listSuggestedFriends()} />;
}

async function PendingSessionInvitesSection() {
  return <PendingSessionInvitesList initialInvites={await listIncomingPendingSessionInvites()} />;
}

export default async function CommunityPage() {
  const t = await getTranslations("Community.whatsapp");
  const [profile, pendingRequests, friendCount, groupCount] = await Promise.all([
    getMyProfile(),
    listPendingRequests(),
    countMyFriends(),
    countMyGroups(),
  ]);

  // CommunityManager guarda las solicitudes en su propio estado local (para
  // las actualizaciones optimistas al aceptar/quitar) — solo las relee al
  // MONTARSE, no en cada re-render con props nuevas. Esta key cambia en
  // cuanto cambia el conjunto de solicitudes (o el número de amigos, que es
  // lo que cambia al aceptar una), así que un router.refresh() tras
  // aceptar/borrar fuerza un remontado limpio con los datos ya frescos del
  // servidor en vez de quedarse con el estado viejo.
  const dataKey = [friendCount, ...pendingRequests.map((r) => r.friendshipId)].join(",");

  return (
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32 md:max-w-3xl lg:max-w-4xl">
      <AppHeader />
      <CommunityManager
        key={dataKey}
        inviteCode={profile.inviteCode}
        initialPendingRequests={pendingRequests}
        friendCount={friendCount}
        groupCount={groupCount}
      />

      <Suspense>
        <SuggestedFriendsSection />
      </Suspense>

      <Suspense>
        <PendingSessionInvitesSection />
      </Suspense>

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

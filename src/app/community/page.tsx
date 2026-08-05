import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { AppHeader } from "@/components/app-header";
import {
  getFriendProgress,
  getMyProfile,
  listFriends,
  listPendingRequests,
} from "@/features/community/application/actions";
import { CommunityManager } from "@/features/community/components/community-manager";
import type { FriendWithProgress } from "@/features/community/components/friends-list";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Community");
  return { title: t("title") };
}

export default async function CommunityPage() {
  const [profile, pendingRequests, friends] = await Promise.all([
    getMyProfile(),
    listPendingRequests(),
    listFriends(),
  ]);

  const friendsWithProgress: FriendWithProgress[] = await Promise.all(
    friends.map(async (friend) => ({
      ...friend,
      ...(await getFriendProgress(friend.ownerId)),
    })),
  );

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
    <main className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-8 pb-32">
      <AppHeader />
      <CommunityManager
        key={dataKey}
        inviteCode={profile.inviteCode}
        initialPendingRequests={pendingRequests}
        initialFriends={friendsWithProgress}
      />
    </main>
  );
}

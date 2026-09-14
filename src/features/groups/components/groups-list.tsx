"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, GraduationCap, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateGroupDialog } from "@/features/groups/components/create-group-dialog";
import { JoinGroupDialog } from "@/features/groups/components/join-group-dialog";
import type { MyGroup } from "@/features/groups/application/actions";

export function GroupsList({ initialGroups }: { initialGroups: MyGroup[] }) {
  const t = useTranslations("Groups");
  const router = useRouter();
  const [groups, setGroups] = useState(initialGroups);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          {t("createGroup")}
        </Button>
        <Button type="button" variant="outline" onClick={() => setJoinOpen(true)}>
          {t("joinGroup")}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`/community/groups/${group.id}`}
                className="border-border hover:bg-muted focus-visible:ring-ring/50 flex items-center justify-between gap-3 rounded-lg border p-3 transition-colors focus-visible:ring-3 focus-visible:outline-none"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {group.kind === "admin" ? (
                    <GraduationCap className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  ) : (
                    <Users className="text-muted-foreground size-4 shrink-0" aria-hidden />
                  )}
                  <span className="truncate font-medium">{group.name}</span>
                  <span className="text-muted-foreground shrink-0 text-xs">
                    {t("memberCount", { count: group.memberCount })}
                  </span>
                </div>
                <ChevronRight className="text-muted-foreground size-5 shrink-0" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}

      <CreateGroupDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(group) => setGroups((prev) => [group, ...prev])}
      />
      <JoinGroupDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={() => router.refresh()}
      />
    </div>
  );
}

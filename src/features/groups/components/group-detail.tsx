"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Copy, LogOut } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GroupWeeklyGoalCard } from "@/features/groups/components/group-weekly-goal-card";
import { GroupActivityFeed } from "@/features/groups/components/group-activity-feed";
import { ShareGroupInviteButton } from "@/features/groups/components/share-group-invite-button";
import { leaveGroup, type GroupDetail as GroupDetailData } from "@/features/groups/application/actions";

export function GroupDetail({ group, myOwnerId }: { group: GroupDetailData; myOwnerId: string }) {
  const t = useTranslations("Groups.detail");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const isOwner = group.ownerId === myOwnerId;

  async function handleCopy() {
    await navigator.clipboard.writeText(group.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleLeave() {
    startTransition(async () => {
      await leaveGroup(group.id);
      router.push("/community/groups");
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-medium">{group.name}</h1>
          <Badge variant="secondary">{t(`kind.${group.kind}`)}</Badge>
        </div>
        {!isOwner && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("leave")}
            onClick={() => setLeaveOpen(true)}
          >
            <LogOut className="size-4" />
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("inviteCodeTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="bg-muted rounded-lg px-4 py-2 font-mono text-xl tracking-widest">
              {group.inviteCode}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={handleCopy}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? t("copied") : t("copy")}
            </Button>
          </div>
          <ShareGroupInviteButton groupName={group.name} inviteCode={group.inviteCode} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("membersTitle", { count: group.members.length })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-2">
            {group.members.map((member) => (
              <li key={member.ownerId} className="flex items-center gap-2 text-sm">
                <span className="truncate">{member.username}</span>
                {member.ownerId === group.ownerId && (
                  <Badge variant="outline">{t(`ownerLabel.${group.kind}`)}</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {group.kind === "admin" && (
        <GroupWeeklyGoalCard groupId={group.id} isOwner={isOwner} initialGoal={group.weeklyGoal} />
      )}

      <div className="flex flex-col gap-3">
        <h2 className="text-base font-medium">{t("activityTitle")}</h2>
        <GroupActivityFeed
          groupId={group.id}
          initialEvents={group.activity}
          initialHasMore={group.hasMoreActivity}
        />
      </div>

      <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("leaveConfirmTitle")}</DialogTitle>
            <DialogDescription>{t("leaveConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="destructive" disabled={isPending} onClick={handleLeave}>
              {isPending ? t("leaving") : t("leaveConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

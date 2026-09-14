"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Check, Copy, LogOut, Trash2, UserMinus } from "lucide-react";
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
import {
  deleteGroup,
  leaveGroup,
  removeGroupMember,
  type GroupDetail as GroupDetailData,
  type GroupMemberInfo,
} from "@/features/groups/application/actions";

export function GroupDetail({ group, myOwnerId }: { group: GroupDetailData; myOwnerId: string }) {
  const t = useTranslations("Groups.detail");
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [removingMember, setRemovingMember] = useState<GroupMemberInfo | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const [isRemovingMember, startRemovingMember] = useTransition();
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

  function handleDelete() {
    startDeleting(async () => {
      await deleteGroup(group.id);
      router.push("/community/groups");
    });
  }

  function handleConfirmRemoveMember() {
    if (!removingMember) return;
    startRemovingMember(async () => {
      await removeGroupMember(group.id, removingMember.ownerId);
      setRemovingMember(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="truncate text-lg font-medium">{group.name}</h1>
          <Badge variant="secondary">{t(`kind.${group.kind}`)}</Badge>
        </div>
        {isOwner ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t("deleteGroup")}
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" />
          </Button>
        ) : (
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
              <li key={member.ownerId} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate">{member.username}</span>
                  {member.ownerId === group.ownerId && (
                    <Badge variant="outline">{t(`ownerLabel.${group.kind}`)}</Badge>
                  )}
                </div>
                {isOwner && member.ownerId !== group.ownerId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={t("removeMember", { name: member.username })}
                    onClick={() => setRemovingMember(member)}
                  >
                    <UserMinus className="size-3.5" />
                  </Button>
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

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("deleteConfirmTitle", { name: group.name })}</DialogTitle>
            <DialogDescription>{t("deleteConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="destructive" disabled={isDeleting} onClick={handleDelete}>
              {isDeleting ? t("deleting") : t("deleteConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={removingMember !== null}
        onOpenChange={(open) => {
          if (!open) setRemovingMember(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("removeMemberConfirmTitle", { name: removingMember?.username ?? "" })}
            </DialogTitle>
            <DialogDescription>{t("removeMemberConfirmDescription")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="destructive"
              disabled={isRemovingMember}
              onClick={handleConfirmRemoveMember}
            >
              {isRemovingMember ? t("removingMember") : t("removeMemberConfirmCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

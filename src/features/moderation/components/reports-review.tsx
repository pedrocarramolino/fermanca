"use client";

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Check, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatSessionDate } from "@/lib/format-date";
import {
  removeReportedContent,
  resolveReport,
  type OpenReport,
} from "@/features/moderation/application/actions";
import type { Locale } from "@/core/domain/user-settings";

/** Lista de denuncias abiertas para el administrador: marcar como revisada
 * o, si era una publicación del Feed, quitarla (lo que cierra también las
 * demás denuncias sobre esa misma publicación). */
export function ReportsReview({ initialReports }: { initialReports: OpenReport[] }) {
  const t = useTranslations("Reports");
  const tModeration = useTranslations("Moderation");
  const locale = useLocale() as Locale;
  const [reports, setReports] = useState(initialReports);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const [, startTransition] = useTransition();

  function run(report: OpenReport, action: "resolve" | "remove") {
    setError(false);
    setBusyId(report.id);
    startTransition(async () => {
      try {
        if (action === "resolve") {
          await resolveReport(report.id);
          setReports((prev) => prev.filter((r) => r.id !== report.id));
        } else {
          await removeReportedContent(report.id);
          setReports((prev) =>
            prev.filter((r) => r.id !== report.id && r.contentId !== report.contentId),
          );
        }
      } catch {
        setError(true);
      } finally {
        setBusyId(null);
      }
    });
  }

  if (reports.length === 0) {
    return (
      <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
        {t("empty")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground text-xs">{t("suspendHint")}</p>
      {error && <p className="text-destructive text-sm">{t("error")}</p>}
      {reports.map((report) => {
        const isPost = report.context === "session_share" || report.context === "weekly_goal_share";
        return (
          <Card key={report.id}>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {t("against", { name: report.reportedUsername })}
                </span>
                <span className="text-muted-foreground text-xs">
                  {formatSessionDate(new Date(report.createdAt), locale)}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{tModeration(`reasons.${report.reason}`)}</Badge>
                <Badge variant="outline">{t(`contexts.${report.context}`)}</Badge>
                {report.openAgainstUser > 1 && (
                  <Badge variant="destructive">
                    {t("openAgainst", { count: report.openAgainstUser })}
                  </Badge>
                )}
              </div>
              {report.details && (
                <p className="bg-muted rounded-lg p-3 break-words whitespace-pre-wrap">
                  {report.details}
                </p>
              )}
              {isPost && (
                <p className="text-muted-foreground text-xs">
                  {report.content
                    ? t("content", {
                        title: report.content.title ?? t("untitled"),
                        date: formatSessionDate(new Date(report.content.createdAt), locale),
                      })
                    : t("contentGone")}
                </p>
              )}
              <p className="text-muted-foreground text-xs">
                {report.reporterUsername
                  ? t("by", { name: report.reporterUsername })
                  : t("byDeleted")}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={busyId !== null}
                  onClick={() => run(report, "resolve")}
                >
                  <Check />
                  {t("resolve")}
                </Button>
                {isPost && report.content && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={busyId !== null}
                    onClick={() => run(report, "remove")}
                  >
                    <Trash2 />
                    {t("removeContent")}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

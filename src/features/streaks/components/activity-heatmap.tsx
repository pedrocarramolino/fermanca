import { getLocale, getTranslations } from "next-intl/server";
import { formatDurationShort } from "@/core/domain/duration";
import { INTL_TAG } from "@/lib/format-date";
import type { Locale } from "@/core/domain/user-settings";
import type { HeatmapCell } from "@/core/domain/streaks";

const LEVEL_CLASS: Record<HeatmapCell["level"], string> = {
  0: "bg-muted",
  1: "bg-primary/25",
  2: "bg-primary/50",
  3: "bg-primary/75",
  4: "bg-primary",
};

export async function ActivityHeatmap({ weeks }: { weeks: HeatmapCell[][] }) {
  const [t, locale] = await Promise.all([getTranslations("Streaks"), getLocale()]);
  const intlTag = INTL_TAG[locale as Locale];
  const dayFormat = new Intl.DateTimeFormat(intlTag, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const monthFormat = new Intl.DateTimeFormat(intlTag, { month: "short" });

  return (
    <div className="flex flex-col gap-1 overflow-x-auto">
      <div className="flex gap-1">
        {weeks.map((week, i) => {
          const monday = week[0]!.date;
          const showMonth = i === 0 || monday.getUTCDate() <= 7;
          return (
            <span key={i} className="text-muted-foreground w-3 shrink-0 text-[10px]">
              {showMonth ? monthFormat.format(monday) : ""}
            </span>
          );
        })}
      </div>
      <div className="flex gap-1">
        {weeks.map((week, i) => (
          <div key={i} className="flex flex-col gap-1">
            {week.map((cell) => (
              <div
                key={cell.date.toISOString()}
                tabIndex={0}
                aria-label={`${dayFormat.format(cell.date)}: ${cell.seconds > 0 ? formatDurationShort(cell.seconds) : t("noPractice")}`}
                title={`${dayFormat.format(cell.date)} · ${cell.seconds > 0 ? formatDurationShort(cell.seconds) : t("noPractice")}`}
                className={`size-3 rounded-[2px] ${LEVEL_CLASS[cell.level]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="text-muted-foreground mt-1 flex items-center gap-1 text-[10px]">
        <span>{t("less")}</span>
        {([0, 1, 2, 3, 4] as const).map((level) => (
          <span key={level} className={`size-3 rounded-[2px] ${LEVEL_CLASS[level]}`} />
        ))}
        <span>{t("more")}</span>
      </div>
    </div>
  );
}

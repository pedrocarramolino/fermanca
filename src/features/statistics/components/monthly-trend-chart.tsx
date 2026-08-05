"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { secondsToHoursDecimal } from "@/core/domain/duration";
import { INTL_TAG } from "@/lib/format-date";
import type { Locale } from "@/core/domain/user-settings";
import type { TimeBucket } from "@/core/domain/session-statistics";

export function MonthlyTrendChart({ buckets }: { buckets: TimeBucket[] }) {
  const t = useTranslations("Statistics");
  const locale = useLocale() as Locale;
  const monthLabel = new Intl.DateTimeFormat(INTL_TAG[locale], { month: "short" });
  const data = buckets.map((bucket) => ({
    label: monthLabel.format(bucket.bucketStart),
    hours: secondsToHoursDecimal(bucket.seconds),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("monthlyChartTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              cursor={{ stroke: "var(--border)" }}
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
              }}
              formatter={(value) => [`${value} h`, t("tooltipPracticed")]}
            />
            <Area
              type="monotone"
              dataKey="hours"
              stroke="var(--primary)"
              strokeWidth={2}
              fill="var(--primary)"
              fillOpacity={0.1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

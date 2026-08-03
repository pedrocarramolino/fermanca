"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { secondsToHoursDecimal } from "@/core/domain/duration";
import type { TimeBucket } from "@/core/domain/session-statistics";

const WEEKDAY_MONTH = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

export function WeeklyChart({ buckets }: { buckets: TimeBucket[] }) {
  const data = buckets.map((bucket) => ({
    label: WEEKDAY_MONTH.format(bucket.bucketStart),
    hours: secondsToHoursDecimal(bucket.seconds),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Horas por semana</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
            barCategoryGap={4}
          >
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
              cursor={{ fill: "var(--muted)" }}
              contentStyle={{
                background: "var(--popover)",
                color: "var(--popover-foreground)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 13,
              }}
              formatter={(value) => [`${value} h`, "Practicado"]}
            />
            <Bar dataKey="hours" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

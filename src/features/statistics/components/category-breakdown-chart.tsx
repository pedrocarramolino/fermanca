"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationShort } from "@/core/domain/duration";
import type { CategoryStat } from "@/core/domain/session-statistics";

export function CategoryBreakdownChart({ stats }: { stats: CategoryStat[] }) {
  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tiempo por categoría</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Todavía no hay datos suficientes.</p>
        </CardContent>
      </Card>
    );
  }

  const data = stats.map((stat) => ({
    name: stat.name,
    seconds: stat.seconds,
    color: stat.color,
    label: formatDurationShort(stat.seconds),
  }));
  const rowHeight = 36;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tiempo por categoría</CardTitle>
      </CardHeader>
      <CardContent style={{ height: data.length * rowHeight + 24 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 48, left: 0, bottom: 0 }}
            barCategoryGap={8}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              tickLine={false}
              axisLine={false}
              width={110}
              tick={{ fill: "var(--foreground)", fontSize: 13 }}
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
              formatter={(_value, _key, item) => [
                (item.payload as { label: string }).label,
                "Tiempo",
              ]}
            />
            <Bar
              dataKey="seconds"
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
              label={{
                position: "right",
                fill: "var(--muted-foreground)",
                fontSize: 12,
                formatter: (value: unknown) => formatDurationShort(Number(value)),
              }}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

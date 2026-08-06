"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDurationShort } from "@/core/domain/duration";
import type { CategoryStat } from "@/core/domain/session-statistics";

/** Escala fija de referencia (2 h) en vez de autoescalar al máximo de los
 * datos: así una categoría con 20 min y otra con 90 min se leen a simple
 * vista sobre la misma vara, no solo una respecto a la otra. */
const MAX_MINUTES = 120;

export function CategoryBreakdownChart({ stats }: { stats: CategoryStat[] }) {
  const t = useTranslations("Statistics");

  if (stats.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("categoryChartTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="border-border text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            {t("categoryEmpty")}
          </p>
        </CardContent>
      </Card>
    );
  }

  const data = stats.map((stat) => ({
    name: stat.name,
    color: stat.color,
    // La barra se recorta en MAX_MINUTES pero el tooltip sigue mostrando la
    // duración real — así una categoría con más de 2h no miente sobre su
    // propio dato, solo deja de crecer visualmente en la vara.
    minutes: Math.min(stat.seconds / 60, MAX_MINUTES),
    durationLabel: formatDurationShort(stat.seconds),
  }));
  const rowHeight = 36;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t("categoryChartTitle")}</CardTitle>
      </CardHeader>
      <CardContent style={{ height: data.length * rowHeight + 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
            barCategoryGap={8}
          >
            <XAxis
              type="number"
              domain={[0, MAX_MINUTES]}
              ticks={[0, 60, 120]}
              tickFormatter={(value: number) => (value === 0 ? "0" : `${value / 60}h`)}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
            />
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
                (item.payload as { durationLabel: string }).durationLabel,
                t("tooltipTime"),
              ]}
            />
            <Bar dataKey="minutes" radius={[0, 4, 4, 0]} maxBarSize={20}>
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

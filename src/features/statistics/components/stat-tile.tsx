import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function StatTile({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
          {Icon && <Icon className="size-4" aria-hidden />}
          {label}
        </span>
        <span className="text-3xl font-semibold tracking-tight">{value}</span>
      </CardContent>
    </Card>
  );
}

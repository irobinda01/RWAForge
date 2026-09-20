import { Badge } from "@/components/ui/badge";
import type { RoadmapItem } from "@/lib/protocol";

export function RoadmapItemRow({ item }: { item: RoadmapItem }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border bg-surface/50 p-3.5 transition-colors hover:border-border-strong">
      <Badge variant={item.status === "infra-ready" ? "primary" : "outline"} className="mt-0.5 shrink-0">
        {item.status === "infra-ready" ? "Infra ready" : "Planned"}
      </Badge>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{item.label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
      </div>
    </div>
  );
}

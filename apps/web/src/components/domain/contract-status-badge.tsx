import { Badge } from "@/components/ui/badge";
import type { ContractStatus } from "@/lib/protocol";

export function ContractStatusBadge({ status }: { status: ContractStatus }) {
  if (status === "live") {
    return (
      <Badge variant="success">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-success" />
        </span>
        Live
      </Badge>
    );
  }
  return <Badge variant="outline">Dormant</Badge>;
}

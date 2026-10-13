import { Badge, Dot } from "@/components/ui/badge";
import { BountyStatus, BOUNTY_STATUS_LABEL } from "@/lib/contracts";
import { cn } from "@/lib/utils";

export function BountyStatusBadge({
  status,
  className,
}: {
  status: BountyStatus;
  className?: string;
}) {
  const tone =
    status === BountyStatus.Paid
      ? "success"
      : status === BountyStatus.UnderVerification
        ? "escrow"
        : "verify";

  return (
    <Badge tone={tone} className={className}>
      <Dot
        className={cn(
          status === BountyStatus.UnderVerification && "animate-pulse-soft",
        )}
      />
      {BOUNTY_STATUS_LABEL[status]}
    </Badge>
  );
}

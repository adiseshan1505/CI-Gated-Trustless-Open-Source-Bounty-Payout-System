import Link from "next/link";
import { ArrowUpRight, Github } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BountyStatusBadge } from "@/components/web3/status-badge";
import { AddressChip } from "@/components/web3/address-chip";
import type { Bounty } from "@/lib/contracts";
import { formatEth, githubIssueUrl, relativeTime } from "@/lib/format";

export function BountyCard({ bounty }: { bounty: Bounty }) {
  const href = `/bounties/${bounty.id.toString()}`;
  return (
    <Card interactive className="group relative">
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Github className="h-4 w-4 shrink-0 text-muted" />
            <span className="truncate text-sm font-medium text-content">
              {bounty.repo}
            </span>
          </div>
          <BountyStatusBadge status={bounty.status} />
        </div>

        <div className="flex items-center justify-between gap-3">
          <a
            href={githubIssueUrl(bounty.repo, bounty.issueNumber)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted underline-offset-2 hover:text-content hover:underline"
          >
            Issue #{bounty.issueNumber.toString()}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <span className="text-lg font-semibold tracking-tight text-escrow">
            {formatEth(bounty.amountWei)} ETH
          </span>
        </div>

        <div className="neu-divider" />

        <div className="flex items-center justify-between text-xs text-faint">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-muted">Owner</span>
            <AddressChip address={bounty.owner} showEns={false} />
          </span>
          <span>{relativeTime(bounty.createdAt)}</span>
        </div>

        <Link
          href={href}
          className="absolute inset-0 rounded-neu focus-visible:outline-none"
          aria-label={`View bounty for ${bounty.repo} issue ${bounty.issueNumber}`}
        />
      </CardContent>
    </Card>
  );
}

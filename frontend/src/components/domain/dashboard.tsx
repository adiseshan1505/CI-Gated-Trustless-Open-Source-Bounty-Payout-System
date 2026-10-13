"use client";

import Link from "next/link";
import {
  Coins,
  GitPullRequest,
  Inbox,
  PlusCircle,
  Wallet,
} from "lucide-react";
import { useAccount } from "wagmi";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { BountyCard } from "@/components/domain/bounty-card";
import { BountyStatusBadge } from "@/components/web3/status-badge";
import { AddressChip } from "@/components/web3/address-chip";
import { ConnectPrompt } from "@/components/web3/connect-prompt";
import { useBounties, useMySubmissions } from "@/hooks/use-bounties";
import { formatEth, githubPullUrl, relativeTime } from "@/lib/format";

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-neu-sm border border-hairline bg-sunken">
          <Icon className={`h-4 w-4 ${tone}`} />
        </span>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-faint">
            {label}
          </p>
          <p className="text-xl font-semibold tracking-tight">{value}</p>
        </div>
      </div>
    </Card>
  );
}

export function Dashboard() {
  const { address, isConnected } = useAccount();
  const { data: bounties, isLoading: loadingBounties } = useBounties();
  const { data: submissions, isLoading: loadingSubs } =
    useMySubmissions(address);

  if (!isConnected || !address) {
    return (
      <ConnectPrompt message="Connect your wallet to see the bounties you've funded and the submissions you've made." />
    );
  }

  const mine = (bounties ?? []).filter(
    (b) => b.owner.toLowerCase() === address.toLowerCase(),
  );
  const bountyById = new Map(
    (bounties ?? []).map((b) => [b.id.toString(), b]),
  );

  const escrowed = mine
    .filter((b) => b.status !== 2)
    .reduce((sum, b) => sum + b.amountWei, 0n);
  const earned = (submissions ?? [])
    .filter((s) => s.paid)
    .reduce(
      (sum, s) => sum + (bountyById.get(s.bountyId.toString())?.amountWei ?? 0n),
      0n,
    );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="bounties">
        <TabsList>
          <TabsTrigger value="bounties">
            <Wallet className="h-4 w-4" />
            My bounties
          </TabsTrigger>
          <TabsTrigger value="submissions">
            <GitPullRequest className="h-4 w-4" />
            My submissions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bounties" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Coins}
              label="Escrowed by you"
              value={`${formatEth(escrowed)} ETH`}
              tone="text-escrow"
            />
            <StatCard
              icon={Wallet}
              label="Bounties funded"
              value={mine.length.toString()}
              tone="text-verify"
            />
            <StatCard
              icon={Inbox}
              label="Currently open"
              value={mine.filter((b) => b.status === 0).length.toString()}
              tone="text-action"
            />
          </div>

          {loadingBounties ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-44 w-full" />
              ))}
            </div>
          ) : mine.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="You haven't funded any bounties"
              description="Lock ETH against a GitHub issue and let the CI pipeline decide who gets paid."
              action={
                <Button asChild variant="verify">
                  <Link href="/bounties/new">
                    <PlusCircle className="h-4 w-4" />
                    Create a bounty
                  </Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {mine.map((b) => (
                <BountyCard key={b.id.toString()} bounty={b} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="submissions" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={Coins}
              label="Total earned"
              value={`${formatEth(earned)} ETH`}
              tone="text-success"
            />
            <StatCard
              icon={GitPullRequest}
              label="Submissions"
              value={(submissions?.length ?? 0).toString()}
              tone="text-verify"
            />
            <StatCard
              icon={Inbox}
              label="Pending"
              value={(submissions ?? [])
                .filter((s) => s.verified == null)
                .length.toString()}
              tone="text-escrow"
            />
          </div>

          {loadingSubs ? (
            <Skeleton className="h-40 w-full" />
          ) : !submissions || submissions.length === 0 ? (
            <EmptyState
              icon={GitPullRequest}
              title="No submissions yet"
              description="Find an open bounty, open a pull request, and register it on-chain."
              action={
                <Button asChild variant="primary">
                  <Link href="/">Browse bounties</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {submissions.map((s) => {
                const bounty = bountyById.get(s.bountyId.toString());
                return (
                  <li
                    key={s.id.toString()}
                    className="neu-panel flex flex-wrap items-center justify-between gap-4 p-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <GitPullRequest className="h-4 w-4 shrink-0 text-muted" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-content">
                            {bounty?.repo ?? `Bounty #${s.bountyId}`}
                          </span>
                          {bounty && (
                            <BountyStatusBadge
                              status={bounty.status}
                              className="hidden sm:inline-flex"
                            />
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-faint">
                          {bounty && (
                            <a
                              href={githubPullUrl(bounty.repo, s.prNumber)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-muted hover:text-action"
                            >
                              PR #{s.prNumber.toString()}
                            </a>
                          )}
                          <span>·</span>
                          <span>{relativeTime(s.submittedAt)}</span>
                          <span>·</span>
                          <AddressChip address={s.developer} showEns={false} />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        tone={
                          s.verified === true
                            ? "success"
                            : s.verified === false
                              ? "danger"
                              : "escrow"
                        }
                      >
                        {s.verified === true
                          ? "Verified"
                          : s.verified === false
                            ? "Rejected"
                            : "Pending"}
                      </Badge>
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/submissions/${s.id.toString()}`}>
                          Track
                        </Link>
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

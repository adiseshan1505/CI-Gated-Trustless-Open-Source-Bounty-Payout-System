"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  FileSearch,
  Github,
  GitPullRequest,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AddressChip } from "@/components/web3/address-chip";
import { BountyStatusBadge } from "@/components/web3/status-badge";
import { ConnectPrompt } from "@/components/web3/connect-prompt";
import { VerificationTimeline } from "@/components/web3/verification-timeline";
import { LifecycleSteps } from "@/components/domain/lifecycle-steps";
import { useBounty, useBountySubmissions } from "@/hooks/use-bounties";
import {
  BountyStatus,
  deriveVerification,
  type Submission,
} from "@/lib/contracts";
import { useAccount } from "wagmi";
import {
  formatDate,
  formatEth,
  githubIssueUrl,
  githubPullUrl,
  relativeTime,
} from "@/lib/format";

function SubmissionRow({
  submission,
  repo,
}: {
  submission: Submission;
  repo: string;
}) {
  const tone =
    submission.verified === true
      ? "success"
      : submission.verified === false
        ? "danger"
        : "escrow";
  const label =
    submission.verified === true
      ? "Verified"
      : submission.verified === false
        ? "Rejected"
        : "Pending";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-neu-sm border border-hairline bg-sunken/60 p-3">
      <div className="flex min-w-0 items-center gap-3">
        <GitPullRequest className="h-4 w-4 shrink-0 text-muted" />
        <div className="min-w-0">
          <a
            href={githubPullUrl(repo, submission.prNumber)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-content hover:text-action"
          >
            PR #{submission.prNumber.toString()}
            <ArrowUpRight className="h-3 w-3" />
          </a>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
            <AddressChip address={submission.developer} showEns={false} />
            <span>·</span>
            <span>{relativeTime(submission.submittedAt)}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge tone={tone}>{label}</Badge>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/submissions/${submission.id.toString()}`}>Track</Link>
        </Button>
      </div>
    </li>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

export function BountyDetail({ id }: { id: string }) {
  const valid = /^\d+$/.test(id);
  const bountyId = valid ? BigInt(id) : undefined;
  const { address } = useAccount();
  const { data: bounty, isLoading, isError } = useBounty(bountyId);
  const { data: submissions } = useBountySubmissions(bountyId);

  if (!valid) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Bounty not found"
        description="That bounty ID is not valid."
        action={
          <Button asChild variant="secondary">
            <Link href="/">Back to bounties</Link>
          </Button>
        }
      />
    );
  }

  if (isLoading) return <DetailSkeleton />;

  if (isError || !bounty) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Bounty not found"
        description={`No bounty with ID ${id} exists on-chain.`}
        action={
          <Button asChild variant="secondary">
            <Link href="/">Back to bounties</Link>
          </Button>
        }
      />
    );
  }

  const isOwner = address?.toLowerCase() === bounty.owner.toLowerCase();
  const latest = submissions?.[submissions.length - 1] ?? null;
  const paidSubmission = submissions?.find((s) => s.paid) ?? null;
  const verification = deriveVerification(latest);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <BountyStatusBadge status={bounty.status} />
          {isOwner && <Badge tone="action">You are the owner</Badge>}
          <span className="text-xs text-faint">
            Bounty #{bounty.id.toString()}
          </span>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Github className="h-6 w-6 text-muted" />
              {bounty.repo}
            </h1>
            <a
              href={githubIssueUrl(bounty.repo, bounty.issueNumber)}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-muted hover:text-action"
            >
              Issue #{bounty.issueNumber.toString()}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wide text-faint">
              Escrowed
            </p>
            <p className="text-3xl font-bold tracking-tight text-escrow">
              {formatEth(bounty.amountWei)}{" "}
              <span className="text-lg">ETH</span>
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardContent className="py-5">
          <LifecycleSteps status={bounty.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              {submissions && submissions.length > 0 ? (
                <ul className="space-y-3">
                  {submissions.map((s) => (
                    <SubmissionRow
                      key={s.id.toString()}
                      submission={s}
                      repo={bounty.repo}
                    />
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  No submissions yet. The first valid PR that passes CI claims
                  the bounty.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-verify" />
                Verification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VerificationTimeline state={verification} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-24">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Funds &amp; ownership</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Escrowed amount</dt>
                  <dd className="font-medium text-escrow">
                    {formatEth(bounty.amountWei)} ETH
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Owner</dt>
                  <dd>
                    <AddressChip address={bounty.owner} />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Created</dt>
                  <dd className="text-content">{formatDate(bounty.createdAt)}</dd>
                </div>
                {paidSubmission && (
                  <div className="flex items-center justify-between">
                    <dt className="text-muted">Paid to</dt>
                    <dd>
                      <AddressChip address={paidSubmission.developer} />
                    </dd>
                  </div>
                )}
              </dl>

              <div className="neu-divider" />

              {bounty.status === BountyStatus.Open && (
                isOwner ? (
                  <p className="text-sm text-muted">
                    Your bounty is live. It will pay out automatically when a
                    PR passes CI and the oracle verifies it.
                  </p>
                ) : address ? (
                  <Button asChild variant="verify" className="w-full">
                    <Link href={`/bounties/${bounty.id.toString()}/submit`}>
                      <GitPullRequest className="h-4 w-4" />
                      Submit a pull request
                    </Link>
                  </Button>
                ) : (
                  <ConnectPrompt message="Connect your wallet to submit a pull request for this bounty." />
                )
              )}

              {bounty.status === BountyStatus.UnderVerification && (
                <div className="space-y-3">
                  <p className="text-sm text-muted">
                    A submission has been registered and the oracle is checking
                    it against the CI result and PR metadata.
                  </p>
                  {latest && (
                    <Button asChild variant="secondary" className="w-full">
                      <Link href={`/submissions/${latest.id.toString()}`}>
                        Track this submission
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {bounty.status === BountyStatus.Paid && (
                <div className="flex items-start gap-2 text-sm text-success">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    This bounty was verified and paid out. The escrow is closed.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {isOwner && bounty.status === BountyStatus.Open && (
            <Button asChild variant="secondary" className="w-full">
              <Link href="/bounties/new">
                <PlusCircle className="h-4 w-4" />
                Fund another bounty
              </Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ExternalLink, FileSearch, Github, GitPullRequest } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AddressChip } from "@/components/web3/address-chip";
import { VerificationTimeline } from "@/components/web3/verification-timeline";
import { useBounty, useSubmission } from "@/hooks/use-bounties";
import { deriveVerification } from "@/lib/contracts";
import { formatDate, formatEth, githubPullUrl } from "@/lib/format";

export function SubmissionTracker({ id }: { id: string }) {
  const valid = /^\d+$/.test(id);
  const submissionId = valid ? BigInt(id) : undefined;
  const { data: submission, isLoading } = useSubmission(submissionId);
  const { data: bounty } = useBounty(submission?.bountyId);

  if (!valid) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Submission not found"
        description="That submission ID is not valid."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!submission) {
    return (
      <EmptyState
        icon={FileSearch}
        title="Submission not found"
        description={`No submission with ID ${id} exists on-chain.`}
        action={
          <Button asChild variant="secondary">
            <Link href="/">Back to bounties</Link>
          </Button>
        }
      />
    );
  }

  const state = deriveVerification(submission);
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-neu-sm border border-hairline bg-sunken">
            <GitPullRequest className="h-5 w-5 text-verify" />
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Submission #{submission.id.toString()}
            </h1>
            <p className="text-sm text-muted">
              Bounty #{submission.bountyId.toString()}
              {bounty ? ` · ${bounty.repo}` : ""}
            </p>
          </div>
        </div>
        <Badge tone={tone} className="text-sm">
          {label}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Oracle verification</CardTitle>
          </CardHeader>
          <CardContent>
            {submission.verified == null && (
              <p className="mb-4 text-xs text-muted">
                Waiting for the oracle to report back. This page refreshes
                automatically.
              </p>
            )}
            <VerificationTimeline state={state} />
          </CardContent>
        </Card>

        <Card className="lg:sticky lg:top-24">
          <CardHeader className="pb-2">
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted">Developer</span>
              <AddressChip address={submission.developer} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted">Registered</span>
              <span className="text-content">
                {formatDate(submission.submittedAt)}
              </span>
            </div>
            {bounty && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Reward</span>
                <span className="font-medium text-escrow">
                  {formatEth(bounty.amountWei)} ETH
                </span>
              </div>
            )}
            {bounty && (
              <div className="flex items-center justify-between">
                <span className="text-muted">Pull request</span>
                <a
                  href={githubPullUrl(bounty.repo, submission.prNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-action hover:underline"
                >
                  PR #{submission.prNumber.toString()}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}
            <div className="neu-divider" />
            <Button asChild variant="secondary" className="w-full">
              <Link href={`/bounties/${submission.bountyId.toString()}`}>
                <Github className="h-4 w-4" />
                View bounty
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

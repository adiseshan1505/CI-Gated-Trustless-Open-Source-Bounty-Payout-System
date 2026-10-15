"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  GitPullRequest,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/field";
import { AddressChip } from "@/components/web3/address-chip";
import { TxButton } from "@/components/web3/tx-button";
import { TxHashLink } from "@/components/web3/tx-hash-link";
import { ConnectPrompt } from "@/components/web3/connect-prompt";
import { useBounty, useMakeSubmission } from "@/hooks/use-bounties";
import {
  BountyStatus,
  CHECK_LABEL,
  CHECK_ORDER,
  CHAIN_ID,
} from "@/lib/contracts";
import { formatEth, githubIssueUrl } from "@/lib/format";

const schema = z.object({
  prNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole PR number")
    .refine((v) => Number(v) > 0, "PR number must be greater than zero"),
});

type FormValues = z.infer<typeof schema>;

export function SubmissionForm({ bountyId }: { bountyId: bigint }) {
  const { isConnected, address, chainId } = useAccount();
  const { data: bounty, isLoading } = useBounty(bountyId);
  const submit = useMakeSubmission();
  const [result, setResult] = React.useState<{
    hash: string;
    submissionId: bigint;
  } | null>(null);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { prNumber: "" },
  });

  if (!isConnected) {
    return (
      <ConnectPrompt message="Connect the wallet you want to be paid to. The address you connect here must match the wallet address you put in your pull request." />
    );
  }

  if (result && bounty) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-escrow/40 bg-escrow/10 text-escrow">
            <GitPullRequest className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-semibold">Submission registered</h2>
          <p className="text-sm text-muted">
            The oracle has been triggered for PR #
            {getValues("prNumber")} on {bounty.repo}. Payout follows
            automatically once verification passes.
          </p>
          <p className="text-xs text-faint">
            Tx: <TxHashLink hash={result.hash} />
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild variant="primary">
              <Link href={`/submissions/${result.submissionId.toString()}`}>
                Track submission
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={`/bounties/${bounty.id.toString()}`}>
                Back to bounty
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onSubmit = () => {
    if (chainId !== CHAIN_ID) {
      toast.error("Switch to the supported network before submitting.");
      return;
    }
    if (bounty && bounty.status !== BountyStatus.Open) {
      toast.error("This bounty is no longer accepting submissions.");
      return;
    }
    submit.mutate(
      { bountyId, prNumber: BigInt(getValues("prNumber")) },
      {
        onSuccess: (data) => {
          setResult({ hash: data.hash, submissionId: data.submissionId });
          toast.success("Submission registered on-chain");
        },
        onError: (err) =>
          toast.error(err.message.split("\n")[0] || "Transaction failed"),
      },
    );
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start"
    >
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Register your pull request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-start gap-3 rounded-neu-sm border border-escrow/40 bg-escrow/10 p-4 text-sm text-escrow">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-semibold">
                Submit only after CI is green.
              </span>{" "}
              The oracle reads the CI result once, the moment you register the
              submission. If{" "}
              <code className="font-mono text-xs">protect-tests</code>,{" "}
              <code className="font-mono text-xs">gitleaks</code>,{" "}
              <code className="font-mono text-xs">trivy</code> or{" "}
              <code className="font-mono text-xs">tests</code> is still running
              or failing, the submission is rejected — just submit again once
              they pass.
            </p>
          </div>

          {bounty && (
            <div className="rounded-neu-sm border border-hairline bg-sunken/60 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Bounty</span>
                <span className="font-medium text-content">{bounty.repo}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted">Issue</span>
                <a
                  href={githubIssueUrl(bounty.repo, bounty.issueNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-action hover:underline"
                >
                  #{bounty.issueNumber.toString()}
                </a>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-muted">Reward</span>
                <span className="font-medium text-escrow">
                  {formatEth(bounty.amountWei)} ETH
                </span>
              </div>
            </div>
          )}

          <Field>
            <FieldLabel htmlFor="prNumber">
              Pull request number
            </FieldLabel>
            <div className="relative">
              <GitPullRequest className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
              <Input
                id="prNumber"
                inputMode="numeric"
                placeholder="42"
                className="pl-10"
                aria-invalid={Boolean(errors.prNumber)}
                {...register("prNumber")}
              />
            </div>
            {errors.prNumber ? (
              <FieldError>{errors.prNumber.message}</FieldError>
            ) : (
              <FieldHint>
                The PR must already be open against {bounty?.repo ?? "the repo"},
                target its base branch, and close issue #
                {bounty?.issueNumber.toString() ?? "…"} in its body.
              </FieldHint>
            )}
          </Field>

          <Field>
            <FieldLabel>Payout wallet</FieldLabel>
            <div className="neu-well flex items-center justify-between px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm text-content">
                <Wallet className="h-4 w-4 text-muted" />
                <AddressChip address={address} />
              </span>
            </div>
            <div className="flex items-start gap-2 rounded-neu-sm border border-escrow/40 bg-escrow/10 p-3 text-xs text-escrow">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Put this exact address in your pull request body. The oracle
                pays the developer only when the PR address matches the wallet
                that calls <code className="font-mono">makeSubmission()</code>.
              </p>
            </div>
          </Field>

          <TxButton
            type="submit"
            variant="verify"
            className="w-full"
            pending={submit.isPending}
            pendingLabel="Registering submission…"
            disabled={isLoading || !bounty}
          >
            <GitPullRequest className="h-4 w-4" />
            Register submission
          </TxButton>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24">
        <CardHeader className="pb-2">
          <CardTitle>What gets checked</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {CHECK_ORDER.map((id) => (
            <div key={id} className="flex gap-2 text-muted">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verify" />
              <span>{CHECK_LABEL[id]}</span>
            </div>
          ))}
          <div className="neu-divider" />
          <p className="text-xs text-faint">
            All six checks run on the original repository. If any fails, the
            submission is rejected and the bounty reopens — no funds move, and
            you can submit again.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}

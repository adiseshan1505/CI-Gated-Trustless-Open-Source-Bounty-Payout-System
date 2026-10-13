"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Github,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldError,
  FieldHint,
  FieldLabel,
} from "@/components/ui/field";
import { TxButton } from "@/components/web3/tx-button";
import { TxHashLink } from "@/components/web3/tx-hash-link";
import { ConnectPrompt } from "@/components/web3/connect-prompt";
import { useCreateBounty } from "@/hooks/use-bounties";
import { CHAIN_ID, type Address } from "@/lib/contracts";
import { cn } from "@/lib/utils";
import { formatEth, isValidRepo } from "@/lib/format";

const schema = z.object({
  repo: z
    .string()
    .trim()
    .min(1, "Repository is required")
    .refine((v) => isValidRepo(v), "Use the owner/repo format, e.g. org/project"),
  issueNumber: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole issue number")
    .refine((v) => Number(v) > 0, "Issue number must be greater than zero"),
  amountEth: z
    .string()
    .trim()
    .regex(/^\d*\.?\d+$/, "Enter a valid amount")
    .refine((v) => Number(v) > 0, "Amount must be greater than zero"),
});

type FormValues = z.infer<typeof schema>;

const STEPS = ["Issue details", "Escrow amount", "Review"];

export function NewBountyForm() {
  const { isConnected, address, chainId } = useAccount();
  const [step, setStep] = React.useState(0);
  const createBounty = useCreateBounty();

  const [result, setResult] = React.useState<{
    bountyId: bigint;
    hash: string;
  } | null>(null);

  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: { repo: "", issueNumber: "", amountEth: "" },
  });

  if (!isConnected) {
    return (
      <ConnectPrompt message="Connect your wallet to fund a bounty. The ETH you lock is held by the escrow contract, not by us." />
    );
  }

  if (result) {
    return (
      <Card className="mx-auto max-w-lg">
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-verify/40 bg-verify/10 text-verify">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <h2 className="text-xl font-semibold">Bounty created</h2>
          <p className="text-sm text-muted">
            {formatEth(parseEther(getValues("amountEth") || "0"))} ETH is now
            locked in escrow for{" "}
            <span className="text-content">{getValues("repo")}</span>.
          </p>
          <p className="text-xs text-faint">
            Tx: <TxHashLink hash={result.hash} />
          </p>
          <div className="mt-2 flex gap-3">
            <Button asChild variant="primary">
              <Link href={`/bounties/${result.bountyId.toString()}`}>
                View bounty
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onNext = async () => {
    const fields: (keyof FormValues)[] =
      step === 0 ? ["repo", "issueNumber"] : ["amountEth"];
    const ok = await trigger(fields);
    if (ok) setStep((s) => s + 1);
  };

  const onSubmit = () => {
    if (chainId !== CHAIN_ID) {
      toast.error("Switch to the supported network before creating a bounty.");
      return;
    }
    const values = getValues();
    createBounty.mutate(
      {
        repo: values.repo.trim(),
        issueNumber: BigInt(values.issueNumber),
        amountWei: parseEther(values.amountEth),
      },
      {
        onSuccess: (data) => {
          setResult(data);
          toast.success("Bounty created — funds locked in escrow");
        },
        onError: (err) =>
          toast.error(err.message.split("\n")[0] || "Transaction failed"),
      },
    );
  };

  const values = getValues();

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr] lg:items-start">
      <Card>
        <CardContent className="py-6">
          <ol className="mb-7 flex items-center gap-2">
            {STEPS.map((label, i) => (
              <li key={label} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                    i < step
                      ? "border-verify bg-verify text-canvas"
                      : i === step
                        ? "border-action bg-action/15 text-action"
                        : "border-hairline bg-sunken text-faint",
                  )}
                >
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "hidden text-xs font-medium sm:block",
                    i === step ? "text-content" : "text-faint",
                  )}
                >
                  {label}
                </span>
                {i < STEPS.length - 1 && (
                  <span className="h-px flex-1 bg-hairline" aria-hidden />
                )}
              </li>
            ))}
          </ol>

          {step === 0 && (
            <div className="space-y-5">
              <Field>
                <FieldLabel htmlFor="repo">GitHub repository</FieldLabel>
                <div className="relative">
                  <Github className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                  <Input
                    id="repo"
                    placeholder="org/project"
                    className="pl-10"
                    aria-invalid={Boolean(errors.repo)}
                    {...register("repo")}
                  />
                </div>
                {errors.repo ? (
                  <FieldError>{errors.repo.message}</FieldError>
                ) : (
                  <FieldHint>
                    The original repository that contains the issue and the
                    protected test suite.
                  </FieldHint>
                )}
              </Field>

              <Field>
                <FieldLabel htmlFor="issueNumber">Issue number</FieldLabel>
                <Input
                  id="issueNumber"
                  inputMode="numeric"
                  placeholder="12"
                  aria-invalid={Boolean(errors.issueNumber)}
                  {...register("issueNumber")}
                />
                {errors.issueNumber ? (
                  <FieldError>{errors.issueNumber.message}</FieldError>
                ) : (
                  <FieldHint>
                    The issue describing the task. Tests defining &ldquo;done&rdquo;
                    must already be committed under /tests.
                  </FieldHint>
                )}
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-5">
              <Field>
                <FieldLabel htmlFor="amountEth">Bounty amount (ETH)</FieldLabel>
                <div className="relative">
                  <Input
                    id="amountEth"
                    inputMode="decimal"
                    placeholder="0.5"
                    className="pr-14 font-mono"
                    aria-invalid={Boolean(errors.amountEth)}
                    {...register("amountEth")}
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-faint">
                    ETH
                  </span>
                </div>
                {errors.amountEth ? (
                  <FieldError>{errors.amountEth.message}</FieldError>
                ) : (
                  <FieldHint>
                    This exact amount is locked in escrow the moment the bounty
                    is created.
                  </FieldHint>
                )}
              </Field>
              <div className="neu-well flex items-start gap-3 p-4 text-sm text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-escrow" />
                <p>
                  Funds leave your wallet now and are held by the contract. You
                  cannot withdraw them; they release only to a developer whose PR
                  passes CI.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <h3 className="text-sm font-medium text-content">
                Review and confirm
              </h3>
              <dl className="space-y-3 rounded-neu-sm border border-hairline bg-sunken/60 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Repository</dt>
                  <dd className="font-medium text-content">{values.repo}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Issue</dt>
                  <dd className="font-medium text-content">
                    #{values.issueNumber}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Escrow amount</dt>
                  <dd className="font-mono font-medium text-escrow">
                    {values.amountEth} ETH
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-muted">Paying from</dt>
                  <dd className="font-mono text-xs text-muted">
                    {address?.slice(0, 6)}…{address?.slice(-4)}
                  </dd>
                </div>
              </dl>
              <div className="flex items-start gap-2 text-xs text-muted">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-verify" />
                <p>
                  Payout is automatic once the oracle confirms the PR date, the
                  destination repo, the PR wallet address and a passing CI run.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0 || createBounty.isPending}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {step < STEPS.length - 1 ? (
              <Button variant="primary" onClick={onNext}>
                Continue
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <TxButton
                variant="verify"
                pending={createBounty.isPending}
                pendingLabel="Locking funds…"
                onClick={onSubmit}
              >
                <Lock className="h-4 w-4" />
                Confirm &amp; lock funds
              </TxButton>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:sticky lg:top-24">
        <CardContent className="space-y-4 py-6 text-sm">
          <h3 className="font-medium text-content">Before you fund</h3>
          <ul className="space-y-3 text-muted">
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verify" />
              Commit the tests that define &ldquo;done&rdquo; under /tests
              first.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verify" />
              Make sure the repo has the bounty-verification GitHub Actions
              workflow.
            </li>
            <li className="flex gap-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-verify" />
              Protect /tests with CODEOWNERS and branch protection.
            </li>
          </ul>
          <div className="neu-divider" />
          <p className="text-xs text-faint">
            The contract is the single source of truth for the funds. Frontend
            state is read back from the chain after the transaction confirms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

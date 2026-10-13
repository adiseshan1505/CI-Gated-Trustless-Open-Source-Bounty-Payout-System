/**
 * Normalised domain types used across the UI.
 *
 * These are deliberately decoupled from the raw contract structs: the mock
 * adapter and the on-chain adapter both produce these shapes, so pages never
 * depend on where the data came from. Fields the proposed `IBountyEscrow`
 * does not yet expose (e.g. per-check oracle verdicts) are optional and the
 * UI degrades gracefully when they are absent.
 */

export const BountyStatus = {
  Open: 0,
  UnderVerification: 1,
  Paid: 2,
} as const;
export type BountyStatus = (typeof BountyStatus)[keyof typeof BountyStatus];

export const BOUNTY_STATUS_LABEL: Record<BountyStatus, string> = {
  [BountyStatus.Open]: "Open",
  [BountyStatus.UnderVerification]: "Under verification",
  [BountyStatus.Paid]: "Paid",
};

export type Address = `0x${string}`;

export type Bounty = {
  id: bigint;
  owner: Address;
  repo: string;
  issueNumber: bigint;
  amountWei: bigint;
  status: BountyStatus;
  /** Block timestamp of `BountyCreated`, or mock creation time. */
  createdAt: bigint;
};

export type Submission = {
  id: bigint;
  bountyId: bigint;
  developer: Address;
  prNumber: bigint;
  submittedAt: bigint;
  /** null = oracle has not reported yet. */
  verified: boolean | null;
  paid: boolean;
};

export type CheckId = "prDate" | "destRepo" | "walletMatch" | "ciPassed";
export type CheckResult = "pass" | "fail" | "unknown";

export const CHECK_LABEL: Record<CheckId, string> = {
  prDate: "PR within bounty window",
  destRepo: "PR targets the funded repo",
  walletMatch: "PR wallet matches signer",
  ciPassed: "CI pipeline passed (Gitleaks, Trivy, tests)",
};

export type VerificationState = {
  submission: "registered" | "none";
  checks: Record<CheckId, CheckResult>;
  verified: boolean | null;
};

export function emptyVerification(): VerificationState {
  return {
    submission: "none",
    checks: {
      prDate: "unknown",
      destRepo: "unknown",
      walletMatch: "unknown",
      ciPassed: "unknown",
    },
    verified: null,
  };
}

export type NewBountyInput = {
  repo: string;
  issueNumber: bigint;
  amountWei: bigint;
};

export type NewSubmissionInput = {
  bountyId: bigint;
  prNumber: bigint;
};

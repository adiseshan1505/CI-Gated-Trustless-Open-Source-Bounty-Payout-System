/**
 * Normalised domain types used across the UI.
 *
 * These are deliberately decoupled from the raw contract structs: the mock
 * adapter and the on-chain adapter both produce these shapes, so pages never
 * depend on where the data came from.
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
  /** Block timestamp of `BountyCreated` (contract `bountyCreatedAt`). */
  createdAt: bigint;
};

export type Submission = {
  id: bigint;
  bountyId: bigint;
  developer: Address;
  prNumber: bigint;
  submittedAt: bigint;
  /** null = oracle has not reported yet; true = paid; false = rejected. */
  verified: boolean | null;
  /** True once the oracle (DON or relayer) has resolved this submission. */
  resolved: boolean;
  /** 6-bit mask of passed oracle checks (`BountyEscrow.submissionChecks`). */
  checks: number;
  paid: boolean;
};

/**
 * Oracle checks, matching `CHECK_*` in `BountyEscrow.sol` and `CHECK` in
 * `oracle/source.js`. The stored/emitted value is the OR of the passing bits.
 */
export const CHECK_BITS = {
  prDate: 1 << 0,
  destRepo: 1 << 1,
  walletMatch: 1 << 2,
  ciPassed: 1 << 3,
  issueLinked: 1 << 4,
  protectedPaths: 1 << 5,
} as const;

export type CheckId = keyof typeof CHECK_BITS;

/** Every check passed (`ALL_CHECKS` in the contract). */
export const ALL_CHECKS = 0x3f;

/** Display order for the verification tracker. */
export const CHECK_ORDER: CheckId[] = [
  "prDate",
  "destRepo",
  "walletMatch",
  "ciPassed",
  "issueLinked",
  "protectedPaths",
];

export const CHECK_LABEL: Record<CheckId, string> = {
  prDate: "PR opened inside the bounty window",
  destRepo: "PR targets the funded repo",
  walletMatch: "Wallet in PR matches the submitter",
  ciPassed: "CI passed (protect-tests, gitleaks, trivy, tests)",
  issueLinked: "PR body closes the bounty issue",
  protectedPaths: "PR leaves tests/ and .github/ untouched",
};

export type CheckResult = "pass" | "fail" | "unknown";

export type VerificationState = {
  submission: "registered" | "none";
  checks: Record<CheckId, CheckResult>;
  verified: boolean | null;
};

export function emptyChecks(): Record<CheckId, CheckResult> {
  return {
    prDate: "unknown",
    destRepo: "unknown",
    walletMatch: "unknown",
    ciPassed: "unknown",
    issueLinked: "unknown",
    protectedPaths: "unknown",
  };
}

export function emptyVerification(): VerificationState {
  return {
    submission: "none",
    checks: emptyChecks(),
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

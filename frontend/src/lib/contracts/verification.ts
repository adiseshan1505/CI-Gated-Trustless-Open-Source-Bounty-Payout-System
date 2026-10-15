import {
  CHECK_BITS,
  CHECK_ORDER,
  emptyChecks,
  emptyVerification,
  type CheckResult,
  type Submission,
  type VerificationState,
} from "./types";

/**
 * Turns a submission's on-chain data into per-check results for the tracker.
 *
 * The contract stores the oracle's 6-bit verdict in `submissionChecks(id)` and
 * flips `isResolved(id)` once it reports. Before that, every check is honestly
 * "unknown" — we never infer a pass.
 */
export function deriveVerification(
  submission: Submission | null,
): VerificationState {
  if (!submission) return emptyVerification();

  if (!submission.resolved) {
    return {
      submission: "registered",
      checks: emptyChecks(),
      verified: null,
    };
  }

  const mask = submission.checks;
  const checks = CHECK_ORDER.reduce(
    (acc, id) => {
      acc[id] = (mask & CHECK_BITS[id]) !== 0 ? "pass" : "fail";
      return acc;
    },
    { ...emptyChecks() } as Record<keyof typeof CHECK_BITS, CheckResult>,
  );

  return {
    submission: "registered",
    checks,
    verified: submission.verified,
  };
}

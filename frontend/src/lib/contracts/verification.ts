import {
  emptyVerification,
  type Submission,
  type VerificationState,
} from "./types";

/**
 * The proposed `IBountyEscrow` only exposes a final `verified` bool, so the
 * four oracle checks are inferred conservatively. When the contract emits
 * per-check events, only this function needs to change.
 */
export function deriveVerification(
  submission: Submission | null,
): VerificationState {
  if (!submission) return emptyVerification();
  if (submission.verified === true) {
    return {
      submission: "registered",
      checks: {
        prDate: "pass",
        destRepo: "pass",
        walletMatch: "pass",
        ciPassed: "pass",
      },
      verified: true,
    };
  }
  return {
    ...emptyVerification(),
    submission: "registered",
    verified: submission.verified,
  };
}

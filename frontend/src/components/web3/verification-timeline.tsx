"use client";

import { Check, Clock, Minus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CHECK_LABEL,
  CHECK_ORDER,
  type CheckId,
  type CheckResult,
  type VerificationState,
} from "@/lib/contracts";

function CheckRow({ id, result }: { id: CheckId; result: CheckResult }) {
  const Icon = result === "pass" ? Check : result === "fail" ? X : Clock;
  const tone =
    result === "pass"
      ? "text-verify"
      : result === "fail"
        ? "text-danger"
        : "text-faint";
  const ring =
    result === "pass"
      ? "border-verify/40 bg-verify/10"
      : result === "fail"
        ? "border-danger/40 bg-danger/10"
        : "border-hairline bg-sunken";

  return (
    <li className="flex items-center gap-3">
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
          ring,
        )}
      >
        <Icon className={cn("h-4 w-4", tone)} />
      </span>
      <span className="flex-1 text-sm text-content">{CHECK_LABEL[id]}</span>
      <span className={cn("text-xs font-medium capitalize", tone)}>
        {result === "unknown" ? "Awaiting oracle" : result}
      </span>
    </li>
  );
}

export function VerificationTimeline({
  state,
  className,
}: {
  state: VerificationState;
  className?: string;
}) {
  if (state.submission === "none") {
    return (
      <div
        className={cn(
          "neu-well flex items-center gap-3 p-4 text-sm text-muted",
          className,
        )}
      >
        <Minus className="h-4 w-4" />
        No submission has been registered on-chain yet.
      </div>
    );
  }

  const total = CHECK_ORDER.length;
  const passed = CHECK_ORDER.filter((id) => state.checks[id] === "pass").length;
  const resolved = CHECK_ORDER.some((id) => state.checks[id] !== "unknown");
  const allPassed = resolved && passed === total;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-faint">
          Oracle checks
        </span>
        <span
          className={cn(
            "text-xs font-semibold",
            !resolved
              ? "text-faint"
              : allPassed
                ? "text-verify"
                : "text-danger",
          )}
        >
          {resolved ? `${passed}/${total} passed` : `${total} checks`}
        </span>
      </div>

      <ol className="relative space-y-3">
        {CHECK_ORDER.map((id) => (
          <CheckRow key={id} id={id} result={state.checks[id]} />
        ))}
      </ol>

      <div className="neu-divider" />

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Oracle verdict</span>
        {state.verified === true ? (
          <span className="font-medium text-verify">Verified — paid out</span>
        ) : state.verified === false && allPassed ? (
          <span className="font-medium text-escrow">
            Checks passed, bounty already claimed
          </span>
        ) : state.verified === false ? (
          <span className="font-medium text-danger">
            Rejected — bounty reopened
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 font-medium text-escrow">
            <Clock className="h-3.5 w-3.5 animate-pulse-soft" />
            Pending
          </span>
        )}
      </div>
    </div>
  );
}

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { BountyStatus } from "@/lib/contracts";

const STEPS = [
  { status: BountyStatus.Open, label: "Open" },
  { status: BountyStatus.UnderVerification, label: "Verifying" },
  { status: BountyStatus.Paid, label: "Paid" },
];

export function LifecycleSteps({ status }: { status: BountyStatus }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step, i) => {
        const done = status > step.status;
        const current = status === step.status;
        return (
          <li key={step.label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done
                    ? "border-verify bg-verify text-canvas"
                    : current
                      ? "border-escrow bg-escrow/15 text-escrow"
                      : "border-hairline bg-sunken text-faint",
                )}
              >
                {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium",
                  current ? "text-content" : "text-faint",
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className={cn(
                  "mb-5 h-px flex-1",
                  done ? "bg-verify/50" : "bg-hairline",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

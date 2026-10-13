import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("flex items-center gap-2.5", className)}
      aria-label="Bounty Escrow home"
    >
      <span className="neu-panel flex h-9 w-9 items-center justify-center rounded-neu-sm">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          aria-hidden
        >
          <path
            d="M12 2.5 20 7v10l-8 4.5L4 17V7l8-4.5Z"
            stroke="rgb(var(--accent-verify))"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path
            d="M8.5 12.2l2.4 2.4 4.6-4.6"
            stroke="rgb(var(--accent-action))"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-sm font-semibold tracking-tight text-content">
          Bounty Escrow
        </span>
        <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-faint">
          CI-gated · trustless
        </span>
      </span>
    </Link>
  );
}

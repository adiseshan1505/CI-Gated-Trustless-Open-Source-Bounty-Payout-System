import Link from "next/link";
import { AlertTriangle, FlaskConical, ShieldCheck } from "lucide-react";
import { CHAIN, DATA_MODE, ESCROW_ADDRESS } from "@/lib/contracts";
import { truncateAddress } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {DATA_MODE === "mock" && (
          <div className="neu-well mb-8 flex items-center gap-3 p-4 text-sm text-muted">
            <FlaskConical className="h-4 w-4 shrink-0 text-escrow" />
            <p>
              <span className="font-medium text-content">Demo mode.</span> The
              escrow contract isn&apos;t wired up, so this UI reads from an
              in-browser mock. Set{" "}
              <code className="font-mono text-xs text-action">
                NEXT_PUBLIC_USE_MOCKS=false
              </code>{" "}
              and{" "}
              <code className="font-mono text-xs text-action">
                NEXT_PUBLIC_ESCROW_ADDRESS
              </code>{" "}
              to read from a live chain.
            </p>
          </div>
        )}

        {DATA_MODE === "unconfigured" && (
          <div className="neu-well mb-8 flex items-center gap-3 border border-danger/40 p-4 text-sm text-danger">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>
              <span className="font-medium">Contract not configured.</span>{" "}
              <code className="font-mono text-xs">NEXT_PUBLIC_USE_MOCKS=false</code>{" "}
              is set but{" "}
              <code className="font-mono text-xs">
                NEXT_PUBLIC_ESCROW_ADDRESS
              </code>{" "}
              is missing, so no data can be read.
            </p>
          </div>
        )}

        {DATA_MODE === "chain" && (
          <div className="neu-well mb-8 flex items-center gap-3 p-4 text-sm text-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-verify" />
            <p>
              Reading live from{" "}
              <span className="font-medium text-content">{CHAIN.name}</span> ·
              escrow{" "}
              <code className="font-mono text-xs text-action">
                {truncateAddress(ESCROW_ADDRESS, 6)}
              </code>
            </p>
          </div>
        )}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-md">
            <p className="text-sm font-semibold text-content">
              Bounty Escrow
            </p>
            <p className="mt-2 text-sm text-muted">
              An automated, trustless escrow that pays open-source contributors
              the moment their pull request passes a hardened CI/CD security
              pipeline.
            </p>
          </div>
          <nav className="flex flex-col gap-2 text-sm" aria-label="Footer">
            <Link href="/" className="text-muted hover:text-content">
              Bounties
            </Link>
            <Link href="/dashboard" className="text-muted hover:text-content">
              Dashboard
            </Link>
            <Link href="/how-it-works" className="text-muted hover:text-content">
              How it works
            </Link>
            <Link
              href="/bounties/new"
              className="text-muted hover:text-content"
            >
              Create a bounty
            </Link>
          </nav>
        </div>
        <div className="neu-divider my-8" />
        <p className="text-xs text-faint">
          Case study · Blockchain 23CSE335 · By Adiseshan &amp; Akshay. Funds
          move only after the authorised oracle verifies CI. Not audited — use
          on testnets.
        </p>
      </div>
    </footer>
  );
}

import Link from "next/link";
import { FlaskConical } from "lucide-react";
import { USE_MOCKS } from "@/lib/contracts";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        {USE_MOCKS && (
          <div className="neu-well mb-8 flex items-center gap-3 p-4 text-sm text-muted">
            <FlaskConical className="h-4 w-4 shrink-0 text-escrow" />
            <p>
              <span className="font-medium text-content">Demo mode.</span> The
              escrow contract isn&apos;t deployed yet, so this UI reads from an
              in-memory mock. Set{" "}
              <code className="font-mono text-xs text-action">
                NEXT_PUBLIC_USE_MOCKS=false
              </code>{" "}
              to read from a live chain.
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

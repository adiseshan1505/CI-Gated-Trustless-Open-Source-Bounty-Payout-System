import Link from "next/link";
import { ArrowRight, PlusCircle, ShieldCheck, Zap } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsStrip } from "@/components/domain/stats-strip";
import { BountyExplorer } from "@/components/domain/bounty-explorer";

const PIPELINE = ["Tests", "Gitleaks", "Trivy", "Oracle", "Payout"];

export default function HomePage() {
  return (
    <Container className="py-10 sm:py-14">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div className="animate-fade-in">
          <Badge tone="verify" className="mb-4">
            <ShieldCheck className="h-3.5 w-3.5" />
            No manual approval · No intermediary
          </Badge>
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
            Get paid the moment your PR{" "}
            <span className="text-verify">passes CI.</span>
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base text-muted">
            Open-source bounties held in a trustless on-chain escrow. When your
            contribution clears the protected test suite and the security scans,
            the contract releases the funds straight to your wallet — in
            seconds, not weeks.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg" variant="primary">
              <Link href="#bounties">
                Browse bounties
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href="/bounties/new">
                <PlusCircle className="h-4 w-4" />
                Fund a bounty
              </Link>
            </Button>
          </div>
        </div>

        <div className="neu-panel animate-fade-in p-6">
          <div className="flex items-center gap-2 text-sm font-medium text-content">
            <Zap className="h-4 w-4 text-escrow" />
            Verification pipeline
          </div>
          <p className="mt-2 text-sm text-muted">
            Every payout is gated by the same automated checks, run on the
            original repository in a network-isolated runner.
          </p>
          <ol className="mt-5 space-y-3">
            {PIPELINE.map((step, i) => (
              <li key={step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-sunken text-xs font-semibold text-muted">
                  {i + 1}
                </span>
                <span className="flex-1 text-sm text-content">{step}</span>
                {i < PIPELINE.length - 1 && (
                  <span className="text-faint" aria-hidden>
                    ↓
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mt-12">
        <StatsStrip />
      </section>

      <section id="bounties" className="mt-12 scroll-mt-20">
        <div className="mb-5 flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Open bounties
            </h2>
            <p className="mt-1 text-sm text-muted">
              Funded issues waiting for a verified contribution.
            </p>
          </div>
        </div>
        <BountyExplorer />
      </section>
    </Container>
  );
}

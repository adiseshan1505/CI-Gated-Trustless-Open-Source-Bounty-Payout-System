import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SubmissionForm } from "@/components/domain/submission-form";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";

export const metadata = { title: "Submit a pull request" };

export default function SubmitPage({ params }: { params: { id: string } }) {
  const valid = /^\d+$/.test(params.id);
  if (!valid) {
    return (
      <Container className="py-10">
        <EmptyState
          icon={FileSearch}
          title="Bounty not found"
          description="That bounty ID is not valid."
          action={
            <Button asChild variant="secondary">
              <Link href="/">Back to bounties</Link>
            </Button>
          }
        />
      </Container>
    );
  }

  return (
    <Container className="py-8 sm:py-10">
      <Link
        href={`/bounties/${params.id}`}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to bounty
      </Link>
      <div className="mb-7 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Submit your work
        </h1>
        <p className="mt-2 text-sm text-muted">
          Register your pull request on-chain. The oracle verifies it and the
          escrow pays out automatically — no manual review.
        </p>
      </div>
      <SubmissionForm bountyId={BigInt(params.id)} />
    </Container>
  );
}

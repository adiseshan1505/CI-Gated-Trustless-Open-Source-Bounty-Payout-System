import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { NewBountyForm } from "@/components/domain/new-bounty-form";

export const metadata = { title: "Create a bounty" };

export default function NewBountyPage() {
  return (
    <Container className="py-8 sm:py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        All bounties
      </Link>
      <div className="mb-7 max-w-2xl">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Fund a bounty
        </h1>
        <p className="mt-2 text-sm text-muted">
          Lock ETH against a GitHub issue. When a contributor&apos;s pull
          request clears the protected tests and security scans, the contract
          pays them automatically.
        </p>
      </div>
      <NewBountyForm />
    </Container>
  );
}

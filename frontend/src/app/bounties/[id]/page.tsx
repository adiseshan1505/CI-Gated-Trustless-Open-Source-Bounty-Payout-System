import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { BountyDetail } from "@/components/domain/bounty-detail";

export default function BountyPage({ params }: { params: { id: string } }) {
  return (
    <Container className="py-8 sm:py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        All bounties
      </Link>
      <BountyDetail id={params.id} />
    </Container>
  );
}

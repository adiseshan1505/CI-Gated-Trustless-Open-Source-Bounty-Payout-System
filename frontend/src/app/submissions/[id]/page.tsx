import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/container";
import { SubmissionTracker } from "@/components/domain/submission-tracker";

export const metadata = { title: "Submission status" };

export default function SubmissionPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <Container className="py-8 sm:py-10">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" />
        Dashboard
      </Link>
      <SubmissionTracker id={params.id} />
    </Container>
  );
}

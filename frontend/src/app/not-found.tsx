import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-16">
      <EmptyState
        icon={FileQuestion}
        title="Page not found"
        description="The page you were looking for doesn't exist or has moved."
        action={
          <Button asChild variant="primary">
            <Link href="/">Back to bounties</Link>
          </Button>
        }
      />
    </Container>
  );
}

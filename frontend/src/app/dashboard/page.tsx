import { Container } from "@/components/layout/container";
import { Dashboard } from "@/components/domain/dashboard";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <Container className="py-8 sm:py-10">
      <div className="mb-7">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-muted">
          Everything tied to your wallet: the bounties you funded and the
          submissions you registered.
        </p>
      </div>
      <Dashboard />
    </Container>
  );
}

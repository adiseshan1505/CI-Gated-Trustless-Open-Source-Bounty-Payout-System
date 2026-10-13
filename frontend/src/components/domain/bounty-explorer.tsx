"use client";

import * as React from "react";
import { LayoutGrid, Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { BountyCardSkeleton } from "@/components/ui/skeleton";
import { BountyCard } from "@/components/domain/bounty-card";
import { useBounties } from "@/hooks/use-bounties";
import { BountyStatus, type BountyStatus as Status } from "@/lib/contracts";
import { cn } from "@/lib/utils";

type Filter = "all" | Status;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: BountyStatus.Open, label: "Open" },
  { value: BountyStatus.UnderVerification, label: "Under verification" },
  { value: BountyStatus.Paid, label: "Paid" },
];

export function BountyExplorer() {
  const { data, isLoading, isError, refetch } = useBounties();
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("all");

  const filtered = React.useMemo(() => {
    const list = data ?? [];
    const q = query.trim().toLowerCase();
    return list.filter((b) => {
      const matchesFilter = filter === "all" || b.status === filter;
      const matchesQuery =
        !q ||
        b.repo.toLowerCase().includes(q) ||
        b.issueNumber.toString().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [data, query, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search repo or issue number"
            aria-label="Search bounties"
            className="pl-10"
          />
        </div>
        <div
          className="neu-well flex items-center gap-1 overflow-x-auto rounded-full p-1"
          role="group"
          aria-label="Filter by status"
        >
          {FILTERS.map((f) => (
            <button
              key={String(f.value)}
              type="button"
              onClick={() => setFilter(f.value)}
              aria-pressed={filter === f.value}
              className={cn(
                "whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-all",
                filter === f.value
                  ? "bg-surface text-content shadow-raised-sm"
                  : "text-muted hover:text-content",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <BountyCardSkeleton key={i} />
          ))}
        </div>
      ) : isError ? (
        <EmptyState
          icon={SearchX}
          title="Couldn't load bounties"
          description="Something went wrong reading on-chain data. Try again."
          action={
            <Button variant="secondary" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={data && data.length ? "No matching bounties" : "No bounties yet"}
          description={
            data && data.length
              ? "Try a different search term or status filter."
              : "Be the first to fund a bounty for an open-source issue."
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((bounty) => (
            <BountyCard key={bounty.id.toString()} bounty={bounty} />
          ))}
        </div>
      )}
    </div>
  );
}

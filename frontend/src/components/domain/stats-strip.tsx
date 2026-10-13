"use client";

import { Coins, CircleDot, CheckCircle2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useBounties } from "@/hooks/use-bounties";
import { BountyStatus } from "@/lib/contracts";
import { formatEth } from "@/lib/format";

export function StatsStrip() {
  const { data, isLoading } = useBounties();
  const list = data ?? [];

  const escrowed = list
    .filter((b) => b.status !== BountyStatus.Paid)
    .reduce((sum, b) => sum + b.amountWei, 0n);
  const paid = list
    .filter((b) => b.status === BountyStatus.Paid)
    .reduce((sum, b) => sum + b.amountWei, 0n);
  const open = list.filter((b) => b.status === BountyStatus.Open).length;

  const items = [
    { icon: Coins, label: "Escrowed", value: `${formatEth(escrowed)} ETH`, tone: "text-escrow" },
    { icon: CircleDot, label: "Open bounties", value: open.toString(), tone: "text-verify" },
    { icon: CheckCircle2, label: "Paid out", value: `${formatEth(paid)} ETH`, tone: "text-success" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label} className="p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-neu-sm border border-hairline bg-sunken">
              <item.icon className={`h-4 w-4 ${item.tone}`} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                {item.label}
              </p>
              {isLoading ? (
                <Skeleton className="mt-1.5 h-6 w-20" />
              ) : (
                <p className="text-xl font-semibold tracking-tight text-content">
                  {item.value}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

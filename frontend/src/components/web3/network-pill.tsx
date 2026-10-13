"use client";

import { AlertTriangle, Check } from "lucide-react";
import { useAccount, useSwitchChain } from "wagmi";
import { cn } from "@/lib/utils";
import { CHAIN, CHAIN_ID } from "@/lib/contracts";
import { Button } from "@/components/ui/button";

export function NetworkPill({ className }: { className?: string }) {
  const { chainId, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();
  const onWrongNetwork = isConnected && chainId !== CHAIN_ID;

  if (onWrongNetwork) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-medium text-danger">
          <AlertTriangle className="h-3.5 w-3.5" />
          Wrong network
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() => switchChain({ chainId: CHAIN_ID })}
          disabled={isPending}
        >
          Switch to {CHAIN.name}
        </Button>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-hairline bg-sunken px-2.5 py-1 text-xs font-medium text-muted",
        className,
      )}
    >
      <Check className="h-3.5 w-3.5 text-verify" />
      {CHAIN.name}
    </span>
  );
}

"use client";

import * as React from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { useEnsName } from "wagmi";
import { cn } from "@/lib/utils";
import { truncateAddress, explorerAddressUrl } from "@/lib/format";
import { EXPLORER_BASE, type Address } from "@/lib/contracts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function AddressChip({
  address,
  size = 4,
  showEns = true,
  className,
}: {
  address?: Address | string;
  size?: number;
  showEns?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const { data: ens } = useEnsName({
    address: address as Address,
    query: { enabled: showEns && Boolean(address) },
  });

  if (!address) {
    return <span className="text-faint">—</span>;
  }

  const url = explorerAddressUrl(EXPLORER_BASE, address);
  const label = ens ?? truncateAddress(address, size);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-mono text-xs text-muted",
        className,
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default text-content">{label}</span>
        </TooltipTrigger>
        <TooltipContent>
          <span className="font-mono">{address}</span>
        </TooltipContent>
      </Tooltip>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy address"}
        className="rounded p-0.5 text-muted transition-colors hover:text-content focus-visible:outline-none"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5 text-verify" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </button>
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          aria-label="View on block explorer"
          className="rounded p-0.5 text-muted transition-colors hover:text-content focus-visible:outline-none"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      )}
    </span>
  );
}

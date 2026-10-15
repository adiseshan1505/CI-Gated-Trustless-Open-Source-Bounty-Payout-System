"use client";

import { ExternalLink } from "lucide-react";
import { EXPLORER_BASE } from "@/lib/contracts";
import { explorerTxUrl, truncateAddress } from "@/lib/format";

export function TxHashLink({ hash }: { hash?: string }) {
  if (!hash) return null;
  const url = explorerTxUrl(EXPLORER_BASE, hash);
  const label = truncateAddress(hash, 6);

  // Chains without a block explorer (e.g. a local Hardhat node) show the hash.
  if (!url) {
    return <span className="font-mono text-xs text-muted">{label}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-action underline-offset-2 hover:underline"
    >
      {label}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

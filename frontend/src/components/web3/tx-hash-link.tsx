"use client";

import { ExternalLink } from "lucide-react";
import { EXPLORER_BASE } from "@/lib/contracts";
import { explorerTxUrl } from "@/lib/format";
import { truncateAddress } from "@/lib/format";

export function TxHashLink({ hash }: { hash?: string }) {
  if (!hash) return null;
  const url = explorerTxUrl(EXPLORER_BASE, hash);
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-action underline-offset-2 hover:underline"
    >
      {truncateAddress(hash, 6)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

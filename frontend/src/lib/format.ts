import { formatEther } from "viem";

/** 1234000000000000000n -> "1.234" (max 4 decimals, trailing zeros trimmed). */
export function formatEth(wei: bigint, maxDecimals = 4): string {
  const value = formatEther(wei);
  const [whole, fraction = ""] = value.split(".");
  if (!fraction) return whole;
  const trimmed = fraction.slice(0, maxDecimals).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function truncateAddress(address?: string, size = 4): string {
  if (!address) return "";
  if (address.length <= size * 2 + 2) return address;
  return `${address.slice(0, size + 2)}…${address.slice(-size)}`;
}

export function formatDate(seconds: bigint | number, withTime = true): string {
  const ms = Number(seconds) * 1000;
  if (!Number.isFinite(ms) || ms === 0) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    ...(withTime ? { timeStyle: "short" } : {}),
  }).format(new Date(ms));
}

export function relativeTime(seconds: bigint | number): string {
  const diff = Number(seconds) * 1000 - Date.now();
  const abs = Math.abs(diff);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, ms] of units) {
    if (abs >= ms) return rtf.format(Math.round(diff / ms), unit);
  }
  return rtf.format(Math.round(diff / 1000), "second");
}

export function isValidRepo(repo: string): boolean {
  return /^[\w.-]+\/[\w.-]+$/.test(repo.trim());
}

function githubBase(repo: string) {
  return `https://github.com/${repo.trim()}`;
}

export function githubIssueUrl(repo: string, issueNumber: number | bigint) {
  return `${githubBase(repo)}/issues/${issueNumber}`;
}

export function githubPullUrl(repo: string, prNumber: number | bigint) {
  return `${githubBase(repo)}/pull/${prNumber}`;
}

export function explorerTxUrl(chainExplorer: string | undefined, hash: string) {
  return chainExplorer ? `${chainExplorer}/tx/${hash}` : undefined;
}

export function explorerAddressUrl(
  chainExplorer: string | undefined,
  address: string,
) {
  return chainExplorer ? `${chainExplorer}/address/${address}` : undefined;
}

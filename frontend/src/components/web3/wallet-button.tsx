"use client";

import * as React from "react";
import {
  Copy,
  ExternalLink,
  LogOut,
  Wallet,
  Loader2,
  ChevronDown,
} from "lucide-react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useEnsName,
} from "wagmi";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EXPLORER_BASE, type Address } from "@/lib/contracts";
import { explorerAddressUrl, truncateAddress } from "@/lib/format";

export function WalletButton() {
  const [open, setOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: ens } = useEnsName({ address });

  React.useEffect(() => {
    if (error) toast.error(error.message.split("\n")[0]);
  }, [error]);

  if (isConnected && address) {
    const url = explorerAddressUrl(EXPLORER_BASE, address);
    const label = ens ?? truncateAddress(address, 4);
    return (
      <div className="relative">
        <Button
          variant="secondary"
          onClick={() => setMenuOpen((o) => !o)}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          className="gap-2"
        >
          <span className="h-2 w-2 rounded-full bg-verify" aria-hidden />
          <span className="font-mono text-xs">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted" />
        </Button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div
              role="menu"
              className="neu-panel absolute right-0 z-50 mt-2 w-56 animate-fade-in p-2"
            >
              <div className="px-2 py-1.5 text-xs text-faint">Connected</div>
              <div className="truncate px-2 pb-2 font-mono text-xs text-content">
                {address}
              </div>
              <div className="neu-divider my-1" />
              <button
                role="menuitem"
                onClick={() => {
                  navigator.clipboard.writeText(address);
                  toast.success("Address copied");
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-neu-sm px-2 py-2 text-sm text-muted transition-colors hover:bg-sunken hover:text-content"
              >
                <Copy className="h-4 w-4" /> Copy address
              </button>
              {url && (
                <a
                  role="menuitem"
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center gap-2 rounded-neu-sm px-2 py-2 text-sm text-muted transition-colors hover:bg-sunken hover:text-content"
                >
                  <ExternalLink className="h-4 w-4" /> View on explorer
                </a>
              )}
              <button
                role="menuitem"
                onClick={() => {
                  disconnect();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-2 rounded-neu-sm px-2 py-2 text-sm text-danger transition-colors hover:bg-danger/10"
              >
                <LogOut className="h-4 w-4" /> Disconnect
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)} className="gap-2">
        <Wallet className="h-4 w-4" />
        Connect wallet
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect a wallet</DialogTitle>
            <DialogDescription>
              Your wallet is your identity here — bounties pay out directly to
              it. Choose how you want to connect.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                onClick={() =>
                  connect(
                    { connector },
                    { onSuccess: () => setOpen(false) },
                  )
                }
                disabled={isPending}
                className="flex w-full items-center justify-between rounded-neu-sm border border-hairline bg-surface px-4 py-3 text-sm font-medium text-content shadow-raised-sm transition-all hover:border-[rgb(var(--border-strong))] active:shadow-sunken-sm disabled:opacity-50"
              >
                <span>{connector.name}</span>
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted" />
                ) : (
                  <Wallet className="h-4 w-4 text-muted" />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted">
            New to wallets? A wallet is a free browser extension or app that
            holds your funds and signs transactions. The app never takes custody
            of your keys.
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}

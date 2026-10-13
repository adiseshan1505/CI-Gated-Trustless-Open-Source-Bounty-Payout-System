"use client";

import { Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { WalletButton } from "@/components/web3/wallet-button";

export function ConnectPrompt({ message }: { message: string }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-hairline bg-sunken text-muted">
          <Wallet className="h-5 w-5" />
        </span>
        <p className="max-w-sm text-sm text-muted">{message}</p>
        <WalletButton />
      </CardContent>
    </Card>
  );
}

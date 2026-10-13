"use client";

import { Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function TxButton({
  pending,
  pendingLabel = "Confirming…",
  children,
  ...props
}: ButtonProps & { pending?: boolean; pendingLabel?: string }) {
  return (
    <Button {...props} disabled={props.disabled || pending}>
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

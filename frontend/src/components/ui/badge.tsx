import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        neutral: "border-hairline bg-sunken text-muted",
        verify: "border-verify/40 bg-verify/10 text-verify",
        action: "border-action/40 bg-action/10 text-action",
        escrow: "border-escrow/40 bg-escrow/10 text-escrow",
        danger: "border-danger/40 bg-danger/10 text-danger",
        success: "border-success/40 bg-success/10 text-success",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, tone, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export function Dot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("h-1.5 w-1.5 shrink-0 rounded-full bg-current", className)}
    />
  );
}

export { badgeVariants };

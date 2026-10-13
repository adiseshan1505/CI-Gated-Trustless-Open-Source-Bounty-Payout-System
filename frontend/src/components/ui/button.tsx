"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-neu-sm font-medium transition-[box-shadow,transform,filter,background-color,color] duration-150 select-none disabled:pointer-events-none disabled:opacity-45 active:translate-y-px",
  {
    variants: {
      variant: {
        // Primary actions use a *distinct* fill so the boundary clears 3:1,
        // rather than relying on same-colour soft shadows alone.
        primary:
          "bg-action text-canvas border border-action font-semibold shadow-raised-sm hover:brightness-110 active:shadow-sunken-sm",
        verify:
          "bg-verify text-canvas border border-verify font-semibold shadow-raised-sm hover:brightness-110 active:shadow-sunken-sm",
        secondary:
          "bg-surface text-content border border-hairline shadow-raised hover:border-[rgb(var(--border-strong))] active:shadow-sunken",
        danger:
          "bg-danger text-canvas border border-danger font-semibold shadow-raised-sm hover:brightness-110 active:shadow-sunken-sm",
        ghost:
          "text-muted border border-transparent hover:text-content hover:bg-surface active:shadow-sunken-sm",
        outline:
          "bg-transparent text-content border border-[rgb(var(--border-strong))] hover:bg-surface active:shadow-sunken-sm",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };

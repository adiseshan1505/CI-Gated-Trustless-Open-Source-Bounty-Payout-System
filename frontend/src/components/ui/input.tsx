import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "neu-well flex h-11 w-full px-4 text-sm text-content placeholder:text-faint",
        "transition-shadow duration-150 focus-visible:outline-none focus-visible:border-[rgb(var(--accent-action))] focus-visible:shadow-accent-glow",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "[color-scheme:dark]",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "neu-well flex min-h-[96px] w-full px-4 py-3 text-sm text-content placeholder:text-faint",
      "transition-shadow duration-150 focus-visible:outline-none focus-visible:border-[rgb(var(--accent-action))] focus-visible:shadow-accent-glow",
      "disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

const Select = React.forwardRef<
  HTMLSelectElement,
  React.ComponentProps<"select">
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "neu-well flex h-11 w-full appearance-none px-4 pr-9 text-sm text-content",
      "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23A7B0C0%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[length:16px] bg-[right_0.9rem_center] bg-no-repeat",
      "transition-shadow duration-150 focus-visible:outline-none focus-visible:border-[rgb(var(--accent-action))] focus-visible:shadow-accent-glow",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export { Input, Textarea, Select };

"use client";

import { Toaster as SonnerToaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function Toaster() {
  const { resolvedTheme } = useTheme();
  return (
    <SonnerToaster
      theme={resolvedTheme}
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "neu-panel !bg-[rgb(var(--surface))] !text-[rgb(var(--text-primary))] !border-[rgb(var(--border-hairline))] !rounded-neu-sm",
          description: "!text-[rgb(var(--text-secondary))]",
          actionButton: "!bg-[rgb(var(--accent-action))] !text-[rgb(var(--canvas))]",
          cancelButton: "!bg-[rgb(var(--surface-sunken))] !text-[rgb(var(--text-secondary))]",
        },
      }}
    />
  );
}

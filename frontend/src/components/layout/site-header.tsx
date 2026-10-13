"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { WalletButton } from "@/components/web3/wallet-button";
import { NetworkPill } from "@/components/web3/network-pill";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "Bounties" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/how-it-works", label: "How it works" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "rounded-neu-sm px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-sunken text-content shadow-sunken-sm"
                  : "text-muted hover:text-content",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <NetworkPill />
          </div>
          <Button
            asChild
            variant="verify"
            size="sm"
            className="hidden sm:inline-flex"
          >
            <Link href="/bounties/new">
              <Plus className="h-4 w-4" />
              New bounty
            </Link>
          </Button>
          <ThemeToggle />
          <WalletButton />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
            className="flex h-10 w-10 items-center justify-center rounded-neu-sm border border-hairline bg-surface text-muted shadow-raised-sm md:hidden"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-hairline bg-canvas px-4 py-3 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-neu-sm px-3 py-2.5 text-sm font-medium",
                  isActive(item.href)
                    ? "bg-sunken text-content"
                    : "text-muted",
                )}
              >
                {item.label}
              </Link>
            ))}
            <Link
              href="/bounties/new"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-neu-sm bg-verify px-3 py-2.5 text-center text-sm font-semibold text-canvas"
            >
              New bounty
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

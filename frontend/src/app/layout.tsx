import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { themeInitScript } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: {
    default: "Bounty Escrow — CI-gated, trustless payouts",
    template: "%s · Bounty Escrow",
  },
  description:
    "An automated, trustless escrow that pays open-source contributors the moment their pull request passes a hardened CI/CD security pipeline.",
};

export const viewport: Viewport = {
  themeColor: "#14171d",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-neu-sm focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:text-content focus:shadow-raised"
        >
          Skip to content
        </a>
        <Providers>
          <div className="flex min-h-dvh flex-col">
            <SiteHeader />
            <main id="main" className="flex-1">
              {children}
            </main>
            <SiteFooter />
          </div>
        </Providers>
      </body>
    </html>
  );
}

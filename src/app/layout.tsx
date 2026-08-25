import type { Metadata } from "next";
import Link from "next/link";

import { HealthPill } from "@/components/health-pill";
import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: "Apollo — ApolloStorage console",
  description: "Browse buckets and objects, upload and download, and watch health for ApolloStorage.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <Providers>
          <header className="border-b border-neutral-800">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-lg font-semibold tracking-tight">Apollo</span>
                <span className="text-xs text-neutral-400">ApolloStorage console</span>
              </Link>
              <HealthPill />
            </div>
          </header>
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}

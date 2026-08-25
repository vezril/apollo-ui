"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Boxes } from "lucide-react";

import { HealthPill } from "./health-pill";
import { cn } from "@/lib/utils";

const TABS = [{ href: "/", label: "Buckets", icon: Boxes, exact: false }];

/**
 * Persistent left sidebar — the constellation console chrome (ux-standards §5):
 * the Apollo god-mark top-left, a vertical nav, and the live health pill pinned
 * to the bottom. Collapses to an icon-only rail below the `sm` breakpoint.
 */
export function ApolloSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 flex h-dvh w-16 shrink-0 flex-col border-r border-sidebar-border bg-sidebar/60 backdrop-blur sm:w-60">
      {/* Brand — god-mark top-left (the mark is the only logo; no wordmark). */}
      <Link
        href="/"
        className="flex items-center gap-3 px-3 py-4 sm:px-4"
        aria-label="Apollo — home"
      >
        {/* apollo.png is keyed onto the theme ground (#06060F ≈ --background),
            NOT transparent — frame it on --background so it composites seamlessly
            and never shows a dark tile against the card-colored sidebar. */}
        <span className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/apollo-logo.png" alt="Apollo" width={36} height={36} className="size-full" />
        </span>
        <span className="hidden text-lg font-semibold tracking-tight sm:inline">Apollo</span>
      </Link>

      {/* Views */}
      <nav className="flex-1 space-y-1 px-2 sm:px-3" aria-label="Apollo views">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname === tab.href || pathname.startsWith("/buckets");
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center justify-center gap-3 rounded-md px-2.5 py-2 text-sm font-medium transition-colors sm:justify-start sm:px-3",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Health, pinned to the bottom */}
      <div className="border-t border-sidebar-border p-3">
        <HealthPill />
      </div>
    </aside>
  );
}

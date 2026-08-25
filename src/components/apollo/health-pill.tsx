"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/apollo/client";
import { cn } from "@/lib/utils";

/**
 * Live ApolloStorage health indicator, pinned to the sidebar bottom. Polled and
 * text-labelled ("Live" / "Down" / "Checking…"), never color-only (ux-standards
 * §5). The label hides on the narrow icon-rail; the dot + tooltip carry it.
 */
export function HealthPill() {
  const { data, isError, isLoading } = useQuery({
    queryKey: ["apollo", "health"],
    queryFn: api.health,
    refetchInterval: 15_000,
  });

  const up = data?.status === "UP" && !isError;
  const label = isLoading ? "Checking…" : up ? "Live" : "Down";
  const dot = isLoading
    ? "bg-status-unknown animate-pulse"
    : up
      ? "bg-status-up"
      : "bg-status-down";

  return (
    <span
      className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-muted-foreground sm:justify-start sm:px-3"
      title={
        data
          ? `${data.service} ${data.status}${data.version ? ` · v${data.version}` : ""}`
          : "Checking ApolloStorage health…"
      }
    >
      <span className={cn("size-2 shrink-0 rounded-full", dot)} />
      <span className="hidden items-baseline gap-1.5 sm:inline-flex">
        {label}
        {up && data?.version ? (
          <span className="text-muted-foreground/70">v{data.version}</span>
        ) : null}
      </span>
    </span>
  );
}

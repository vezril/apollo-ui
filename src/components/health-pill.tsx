"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/apollo/client";
import { cn } from "@/lib/utils";

/** Live health indicator, polled from the Apollo BFF. */
export function HealthPill() {
  const { data, isError } = useQuery({
    queryKey: ["health"],
    queryFn: api.health,
    refetchInterval: 10_000,
  });
  const up = data?.status === "UP" && !isError;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
        up
          ? "border-emerald-800 bg-emerald-950 text-emerald-300"
          : "border-neutral-700 bg-neutral-900 text-neutral-400"
      )}
      title={data ? `${data.service} ${data.status}` : "checking…"}
    >
      <span className={cn("size-1.5 rounded-full", up ? "bg-emerald-400" : "bg-neutral-500")} />
      {up ? "UP" : data ? "DOWN" : "…"}
      {data?.version ? <span className="text-neutral-500">v{data.version}</span> : null}
    </span>
  );
}

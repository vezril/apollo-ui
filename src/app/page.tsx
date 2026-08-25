"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Boxes, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/apollo/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/apollo/client";

/** Buckets view — list, create, and delete buckets (read model is eventually consistent). */
export default function BucketsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const buckets = useQuery({ queryKey: ["buckets"], queryFn: api.listBuckets });
  const refetchSoon = () => setTimeout(() => qc.invalidateQueries({ queryKey: ["buckets"] }), 1500);

  const create = useMutation({
    mutationFn: (b: string) => api.createBucket(b),
    onSuccess: () => {
      setName("");
      setError(null);
      refetchSoon();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (b: string) => api.deleteBucket(b),
    onSuccess: refetchSoon,
    onError: (e: Error) => setError(e.message),
  });

  const syncing = create.isPending || remove.isPending;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">Buckets</h1>
            {/* Visible-syncing badge — optimistic/pending state is never silent. */}
            {syncing ? (
              <Badge variant="muted" className="gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                syncing…
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            Object storage backed by QuObjects (S3).
          </p>
        </div>

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate(name.trim());
          }}
        >
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="new-bucket-name"
            aria-label="New bucket name"
            className="w-48 font-mono"
          />
          <Button type="submit" disabled={create.isPending || !name.trim()}>
            Create
          </Button>
        </form>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-card/60">
        {buckets.isLoading ? (
          <ul className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="px-4 py-3">
                <Skeleton className="h-5 w-40" />
              </li>
            ))}
          </ul>
        ) : buckets.isError ? (
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load buckets: {(buckets.error as Error).message}
            </p>
            <Button variant="outline" size="sm" onClick={() => buckets.refetch()}>
              Retry
            </Button>
          </div>
        ) : !buckets.data?.buckets.length ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <Boxes className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">No buckets yet</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Create your first bucket above — then open it to upload objects.
            </p>
          </div>
        ) : (
          <ul className="divide-y">
            {buckets.data.buckets.map((b) => (
              <li
                key={b}
                className="group flex items-center justify-between gap-3 px-4 py-2.5 transition-colors hover:bg-accent/40"
              >
                <Link
                  href={`/buckets/${encodeURIComponent(b)}`}
                  className="flex min-w-0 flex-1 items-center gap-2 text-sm"
                >
                  <Boxes className="size-4 shrink-0 text-chart-1" />
                  <span className="truncate font-mono">{b}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <ConfirmDialog
                  title={`Delete bucket “${b}”?`}
                  description="The bucket must be empty. This cannot be undone."
                  confirmLabel="Delete bucket"
                  pending={remove.isPending}
                  onConfirm={() => remove.mutate(b)}
                  trigger={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete bucket ${b}`}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-xs text-muted-foreground/70">
        Listing is served from Apollo&apos;s read model and is eventually consistent — a new bucket
        may take a moment to appear.
      </p>
    </div>
  );
}

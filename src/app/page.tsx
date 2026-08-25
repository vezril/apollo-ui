"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { api } from "@/lib/apollo/client";

/** Buckets view — list, create, and delete buckets (read model is eventually consistent). */
export default function BucketsPage() {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const buckets = useQuery({ queryKey: ["buckets"], queryFn: api.listBuckets });

  const create = useMutation({
    mutationFn: (b: string) => api.createBucket(b),
    onSuccess: () => {
      setName("");
      setError(null);
      // Read model lags a beat; refetch shortly after.
      setTimeout(() => qc.invalidateQueries({ queryKey: ["buckets"] }), 1500);
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (b: string) => api.deleteBucket(b),
    onSuccess: () => setTimeout(() => qc.invalidateQueries({ queryKey: ["buckets"] }), 1500),
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Buckets</h1>
          <p className="text-sm text-neutral-400">Object storage backed by QuObjects (S3).</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim()) create.mutate(name.trim());
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="new-bucket-name"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            disabled={create.isPending || !name.trim()}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="rounded-lg border border-neutral-800">
        {buckets.isLoading ? (
          <p className="p-4 text-sm text-neutral-500">Loading…</p>
        ) : buckets.isError ? (
          <p className="p-4 text-sm text-red-400">{(buckets.error as Error).message}</p>
        ) : !buckets.data?.buckets.length ? (
          <p className="p-4 text-sm text-neutral-500">No buckets yet.</p>
        ) : (
          <ul className="divide-y divide-neutral-800">
            {buckets.data.buckets.map((b) => (
              <li key={b} className="flex items-center justify-between px-4 py-2.5">
                <Link href={`/buckets/${encodeURIComponent(b)}`} className="text-sm hover:underline">
                  {b}
                </Link>
                <button
                  onClick={() => {
                    if (confirm(`Delete bucket "${b}"? It must be empty.`)) remove.mutate(b);
                  }}
                  className="text-xs text-neutral-500 hover:text-red-400"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

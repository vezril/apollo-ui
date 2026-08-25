"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";

import { api } from "@/lib/apollo/client";
import { formatBytes } from "@/lib/utils";

/** Object browser for one bucket — list by prefix, upload, download, delete. */
export default function BucketPage() {
  const params = useParams<{ bucket: string }>();
  const bucket = decodeURIComponent(params.bucket);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [prefix, setPrefix] = useState("");
  const [error, setError] = useState<string | null>(null);

  const key = ["objects", bucket, prefix] as const;
  const objects = useQuery({
    queryKey: key,
    queryFn: () => api.listObjects(bucket, prefix),
    // The read model is eventually consistent: a just-created bucket returns
    // BUCKET_NOT_FOUND for a moment. Ride that out as a loading state rather than
    // a hard error (a genuinely missing bucket still surfaces after the retries).
    retry: (failureCount, error) =>
      failureCount < 6 && /exist|not[\s-]?found/i.test((error as Error).message),
    retryDelay: 1200,
  });
  const refetchSoon = () => setTimeout(() => qc.invalidateQueries({ queryKey: ["objects", bucket] }), 1500);

  const upload = useMutation({
    mutationFn: (file: File) => api.uploadObject(bucket, file.name, file),
    onSuccess: () => {
      setError(null);
      if (fileRef.current) fileRef.current.value = "";
      refetchSoon();
    },
    onError: (e: Error) => setError(e.message),
  });

  const remove = useMutation({
    mutationFn: (object: string) => api.deleteObject(bucket, object),
    onSuccess: refetchSoon,
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link href="/" className="text-xs text-neutral-500 hover:underline">
            ← buckets
          </Link>
          <h1 className="text-xl font-semibold">{bucket}</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="prefix filter"
            className="rounded-md border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <input
            ref={fileRef}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
            }}
            className="hidden"
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={upload.isPending}
            className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50"
          >
            {upload.isPending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      {error ? <p className="text-sm text-red-400">{error}</p> : null}

      <div className="rounded-lg border border-neutral-800">
        {objects.isLoading ? (
          <p className="p-4 text-sm text-neutral-500">Loading…</p>
        ) : objects.isError ? (
          <p className="p-4 text-sm text-red-400">{(objects.error as Error).message}</p>
        ) : !objects.data?.objects.length ? (
          <p className="p-4 text-sm text-neutral-500">No objects{prefix ? ` under “${prefix}”` : ""}.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-neutral-500">
              <tr className="border-b border-neutral-800">
                <th className="px-4 py-2 font-medium">Object</th>
                <th className="px-4 py-2 font-medium">Size</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Gen</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {objects.data.objects.map((o) => (
                <tr key={o.object}>
                  <td className="px-4 py-2 font-mono text-xs">{o.object}</td>
                  <td className="px-4 py-2 text-neutral-300">{formatBytes(o.size)}</td>
                  <td className="px-4 py-2 text-neutral-400">{o.contentType}</td>
                  <td className="px-4 py-2 text-neutral-400">{o.generation}</td>
                  <td className="px-4 py-2 text-right">
                    <a
                      href={api.objectHref(bucket, o.object)}
                      className="text-xs text-neutral-400 hover:text-neutral-100"
                    >
                      download
                    </a>
                    <button
                      onClick={() => {
                        if (confirm(`Delete “${o.object}”?`)) remove.mutate(o.object);
                      }}
                      className="ml-3 text-xs text-neutral-500 hover:text-red-400"
                    >
                      delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-neutral-600">
        Listing is served from the read model and is eventually consistent — a new upload may take a
        moment to appear.
      </p>
    </div>
  );
}

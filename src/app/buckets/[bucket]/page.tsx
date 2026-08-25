"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { ConfirmDialog } from "@/components/apollo/confirm-dialog";
import { ObjectPreview } from "@/components/apollo/object-preview";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  const refetchSoon = () =>
    setTimeout(() => qc.invalidateQueries({ queryKey: ["objects", bucket] }), 1500);

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

  const syncing = upload.isPending || remove.isPending;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3" /> buckets
          </Link>
          <div className="flex items-center gap-2">
            <h1 className="font-mono text-xl font-semibold tracking-tight">{bucket}</h1>
            {syncing ? (
              <Badge variant="muted" className="gap-1.5">
                <Loader2 className="size-3 animate-spin" />
                syncing…
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="prefix filter"
            aria-label="Filter by prefix"
            className="w-40 font-mono"
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
          <Button onClick={() => fileRef.current?.click()} disabled={upload.isPending}>
            {upload.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Uploading…
              </>
            ) : (
              <>
                <Upload className="size-4" /> Upload
              </>
            )}
          </Button>
        </div>
      </header>

      {error ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-foreground">
          {error}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border bg-card/60">
        {objects.isLoading ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ) : objects.isError ? (
          <div className="space-y-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Couldn&apos;t load objects: {(objects.error as Error).message}
            </p>
            <Button variant="outline" size="sm" onClick={() => objects.refetch()}>
              Retry
            </Button>
          </div>
        ) : !objects.data?.objects.length ? (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <FileText className="size-8 text-muted-foreground/60" />
            <p className="text-sm font-medium">
              No objects{prefix ? ` under “${prefix}”` : ""}
            </p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Use <span className="font-medium text-foreground">Upload</span> to add a file — it
              streams straight to QuObjects.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr className="border-b">
                  <th className="px-4 py-2.5 font-medium">Object</th>
                  <th className="px-4 py-2.5 font-medium">Size</th>
                  <th className="px-4 py-2.5 font-medium">Type</th>
                  <th className="px-4 py-2.5 font-medium">Gen</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {objects.data.objects.map((o) => (
                  <tr key={o.object} className="transition-colors hover:bg-accent/40">
                    <td className="max-w-xs px-4 py-2.5">
                      <ObjectPreview
                        bucket={bucket}
                        obj={o}
                        trigger={
                          <button
                            type="button"
                            title={`Preview ${o.object}`}
                            className="block max-w-full truncate text-left font-mono text-xs hover:text-primary hover:underline"
                          >
                            {o.object}
                          </button>
                        }
                      />
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{formatBytes(o.size)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.contentType}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{o.generation}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild variant="ghost" size="icon" aria-label={`Download ${o.object}`}>
                          <a href={api.objectHref(bucket, o.object)}>
                            <Download className="size-4" />
                          </a>
                        </Button>
                        <ConfirmDialog
                          title={`Delete “${o.object}”?`}
                          description="This permanently removes the object. This cannot be undone."
                          confirmLabel="Delete object"
                          pending={remove.isPending}
                          onConfirm={() => remove.mutate(o.object)}
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${o.object}`}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          }
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground/70">
        Listing is served from Apollo&apos;s read model and is eventually consistent — a new upload
        may take a moment to appear.
      </p>
    </div>
  );
}

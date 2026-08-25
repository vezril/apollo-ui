"use client";

import { useQuery } from "@tanstack/react-query";
import { Download, FileQuestion } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/apollo/client";
import type { ObjectEntry } from "@/lib/apollo/types";
import { cn, formatBytes } from "@/lib/utils";

/** Only fetch text bodies up to this size inline; larger ones prompt a download. */
const TEXT_PREVIEW_CAP = 512 * 1024;

type Kind = "image" | "text" | "pdf" | "audio" | "video" | "other";

function kindOf(contentType: string): Kind {
  const ct = contentType.toLowerCase();
  if (ct.startsWith("image/")) return "image";
  if (ct.startsWith("audio/")) return "audio";
  if (ct.startsWith("video/")) return "video";
  if (ct === "application/pdf") return "pdf";
  if (
    ct.startsWith("text/") ||
    /(json|xml|javascript|ecmascript|x-yaml|yaml|x-sh|x-www-form-urlencoded|csv|markdown)/.test(ct)
  )
    return "text";
  return "other";
}

/** A single labelled metadata cell for the preview header strip. */
function Meta({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-xs", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/**
 * Click-to-preview for one object. Renders inline by content type — images,
 * text/JSON, PDF, audio, video — and falls back to a metadata card + download
 * for anything binary. Text bodies are fetched (capped) only while the dialog is
 * open; the bytes come from the same BFF path as download, served `inline`.
 */
export function ObjectPreview({
  bucket,
  obj,
  trigger,
}: {
  bucket: string;
  obj: ObjectEntry;
  trigger: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const kind = kindOf(obj.contentType);
  const previewHref = api.previewHref(bucket, obj.object);
  const downloadHref = api.objectHref(bucket, obj.object);
  const textTooBig = kind === "text" && obj.size > TEXT_PREVIEW_CAP;

  const text = useQuery({
    queryKey: ["preview", bucket, obj.object, obj.generation],
    queryFn: ({ signal }) => api.fetchText(bucket, obj.object, signal),
    enabled: open && kind === "text" && !textTooBig,
    staleTime: 60_000,
    retry: false,
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="truncate font-mono text-base">{obj.object}</DialogTitle>
          <DialogDescription className="sr-only">Object preview</DialogDescription>
        </DialogHeader>

        {/* Metadata strip */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-md border bg-card/60 p-3 sm:grid-cols-4">
          <Meta label="Type" value={obj.contentType} mono />
          <Meta label="Size" value={formatBytes(obj.size)} />
          <Meta label="Gen" value={obj.generation} />
          <Meta label="crc32c" value={obj.crc32c} mono />
        </dl>

        {/* Body — rendered by kind */}
        <div className="max-h-[55vh] overflow-auto rounded-md border bg-background">
          {kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewHref}
              alt={obj.object}
              className="mx-auto max-h-[55vh] w-auto object-contain"
            />
          ) : kind === "pdf" ? (
            <iframe src={previewHref} title={obj.object} className="h-[55vh] w-full" />
          ) : kind === "audio" ? (
            <div className="p-6">
              <audio controls src={previewHref} className="w-full">
                <track kind="captions" />
              </audio>
            </div>
          ) : kind === "video" ? (
            <video controls src={previewHref} className="max-h-[55vh] w-full">
              <track kind="captions" />
            </video>
          ) : kind === "text" ? (
            textTooBig ? (
              <PreviewFallback
                message={`This file is ${formatBytes(obj.size)} — too large to preview inline.`}
                downloadHref={downloadHref}
              />
            ) : text.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-4 w-full" />
                ))}
              </div>
            ) : text.isError ? (
              <PreviewFallback
                message={`Couldn't load preview: ${(text.error as Error).message}`}
                downloadHref={downloadHref}
              />
            ) : (
              <pre className="overflow-x-auto p-4 text-xs leading-relaxed">
                <code className="font-mono">{text.data}</code>
              </pre>
            )
          ) : (
            <PreviewFallback
              message="No inline preview for this file type."
              downloadHref={downloadHref}
            />
          )}
        </div>

        <DialogFooter>
          <Button asChild variant="secondary" size="sm">
            <a href={downloadHref}>
              <Download className="size-4" /> Download
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Centered "can't preview" state with a download escape hatch. */
function PreviewFallback({
  message,
  downloadHref,
}: {
  message: string;
  downloadHref: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 p-10 text-center">
      <FileQuestion className="size-8 text-muted-foreground/60" />
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      <Button asChild variant="outline" size="sm">
        <a href={downloadHref}>
          <Download className="size-4" /> Download
        </a>
      </Button>
    </div>
  );
}

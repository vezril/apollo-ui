"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Download, FileQuestion } from "lucide-react";
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

/** Copy text to the clipboard, with a fallback for insecure (http) contexts
 * where navigator.clipboard is unavailable — the app is served over plain HTTP
 * on the tailnet, so the Clipboard API alone would silently fail there. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to the execCommand path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Small copy-to-clipboard affordance with a brief "copied" confirmation. */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      title={`Copy ${label}`}
      onClick={async () => {
        if (await copyText(value)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        }
      }}
      className="shrink-0 rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground"
    >
      {copied ? <Check className="size-3.5 text-status-up" /> : <Copy className="size-3.5" />}
    </button>
  );
}

/** A single labelled metadata cell. */
function Meta({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-xs", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

/** A full-width checksum row: label + full (non-truncated) mono value + copy. */
function HashField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <dt className="w-16 shrink-0 pt-0.5 text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 break-all font-mono text-xs">{value}</dd>
      <CopyButton value={value} label={label} />
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

        {/* Metadata — the full object metadata (read-model fields). */}
        <dl className="space-y-3 rounded-md border bg-card/60 p-3">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
            <Meta label="Content type" value={obj.contentType} mono />
            <Meta
              label="Size"
              value={
                obj.size < 1024
                  ? `${obj.size} B`
                  : `${formatBytes(obj.size)} · ${obj.size.toLocaleString()} B`
              }
            />
            <Meta label="Generation" value={obj.generation} />
          </div>
          <div className="space-y-2 border-t pt-3">
            <HashField label="crc32c" value={obj.crc32c} />
            <HashField label="md5" value={obj.md5} />
          </div>
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

import type { BucketList, HealthStatus, ObjectEntry, ObjectList } from "./types";

// Same-origin BFF base (NOT a secret). Baked at build time by the Dockerfile;
// defaults to the co-hosted /api/apollo routes.
const BASE = process.env.NEXT_PUBLIC_APOLLO_API_BASE ?? "/api/apollo";

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || `${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: (): Promise<HealthStatus> => fetch(`${BASE}/health`).then((r) => json(r)),

  listBuckets: (): Promise<BucketList> => fetch(`${BASE}/buckets`).then((r) => json(r)),

  createBucket: async (bucket: string): Promise<void> => {
    const r = await fetch(`${BASE}/buckets/${encodeURIComponent(bucket)}`, { method: "PUT" });
    if (!r.ok) throw new Error((await r.text()) || `create failed (${r.status})`);
  },

  deleteBucket: async (bucket: string): Promise<void> => {
    const r = await fetch(`${BASE}/buckets/${encodeURIComponent(bucket)}`, { method: "DELETE" });
    if (!r.ok) throw new Error((await r.text()) || `delete failed (${r.status})`);
  },

  listObjects: (bucket: string, prefix = ""): Promise<ObjectList> => {
    const qs = prefix ? `?prefix=${encodeURIComponent(prefix)}` : "";
    return fetch(`${BASE}/buckets/${encodeURIComponent(bucket)}/objects${qs}`).then((r) => json(r));
  },

  objectHref: (bucket: string, object: string): string =>
    `${BASE}/buckets/${encodeURIComponent(bucket)}/objects/${object
      .split("/")
      .map(encodeURIComponent)
      .join("/")}`,

  /** Same bytes as objectHref, but served `inline` for in-app preview (img/pdf/media). */
  previewHref: (bucket: string, object: string): string =>
    `${api.objectHref(bucket, object)}?inline=1`,

  /** Fetch an object's bytes as text, for previewing text/JSON/etc. Aborts via `signal`. */
  fetchText: async (bucket: string, object: string, signal?: AbortSignal): Promise<string> => {
    const r = await fetch(api.previewHref(bucket, object), { signal });
    if (!r.ok) throw new Error((await r.text()) || `preview failed (${r.status})`);
    return r.text();
  },

  uploadObject: async (bucket: string, object: string, file: File): Promise<ObjectEntry> => {
    const r = await fetch(api.objectHref(bucket, object), {
      method: "PUT",
      headers: { "content-type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!r.ok) throw new Error((await r.text()) || `upload failed (${r.status})`);
    return r.json() as Promise<ObjectEntry>;
  },

  deleteObject: async (bucket: string, object: string): Promise<void> => {
    const r = await fetch(api.objectHref(bucket, object), { method: "DELETE" });
    if (!r.ok) throw new Error((await r.text()) || `delete failed (${r.status})`);
  },
};

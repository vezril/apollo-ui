import { NextResponse } from "next/server";

import { apolloFetch, encodeObjectPath } from "@/lib/apollo/server/client";
import { apolloErrorResponse, bffError, proxyJson } from "@/lib/apollo/server/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ bucket: string; key: string[] }> };

function objectPath(bucket: string, key: string[]): string {
  return `/v1/buckets/${encodeURIComponent(bucket)}/objects/${encodeObjectPath(key.join("/"))}`;
}

const META_HEADERS = ["x-apollo-generation", "x-apollo-size", "x-apollo-crc32c", "x-apollo-md5"];

/** GET — stream the object bytes back to the browser as a download. */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { bucket, key } = await params;
    const res = await apolloFetch(objectPath(bucket, key));
    if (!res.ok) return apolloErrorResponse(res);
    const headers = new Headers();
    const ct = res.headers.get("content-type");
    if (ct) headers.set("content-type", ct);
    const len = res.headers.get("content-length");
    if (len) headers.set("content-length", len);
    const filename = (key[key.length - 1] || "object").replace(/["\\]/g, "");
    headers.set("content-disposition", `attachment; filename="${filename}"`);
    for (const h of META_HEADERS) {
      const v = res.headers.get(h);
      if (v) headers.set(h, v);
    }
    return new NextResponse(res.body, { status: 200, headers });
  } catch (e) {
    return bffError(e);
  }
}

/** PUT — stream the raw request body up as the object payload. */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { bucket, key } = await params;
    const headers = new Headers();
    headers.set("content-type", req.headers.get("content-type") ?? "application/octet-stream");
    for (const h of ["x-apollo-crc32c", "x-apollo-md5"]) {
      const v = req.headers.get(h);
      if (v) headers.set(h, v); // optional expected-checksum passthrough
    }
    // Streaming request body to fetch requires the half-duplex flag (undici/Node).
    const init = { method: "PUT", headers, body: req.body, duplex: "half" } as RequestInit & {
      duplex: "half";
    };
    return proxyJson(await apolloFetch(objectPath(bucket, key), init), 201);
  } catch (e) {
    return bffError(e);
  }
}

/** DELETE — remove the object. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { bucket, key } = await params;
    return proxyJson(await apolloFetch(objectPath(bucket, key), { method: "DELETE" }), 204);
  } catch (e) {
    return bffError(e);
  }
}

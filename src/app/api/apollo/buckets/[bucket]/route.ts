import { apolloFetch } from "@/lib/apollo/server/client";
import { bffError, proxyJson } from "@/lib/apollo/server/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ bucket: string }> };

/** PUT /api/apollo/buckets/{bucket} — CreateBucket. */
export async function PUT(_req: Request, { params }: Ctx) {
  try {
    const { bucket } = await params;
    const res = await apolloFetch(`/v1/buckets/${encodeURIComponent(bucket)}`, { method: "PUT" });
    return proxyJson(res, 201);
  } catch (e) {
    return bffError(e);
  }
}

/** DELETE /api/apollo/buckets/{bucket} — DeleteBucket. */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { bucket } = await params;
    const res = await apolloFetch(`/v1/buckets/${encodeURIComponent(bucket)}`, { method: "DELETE" });
    return proxyJson(res, 204);
  } catch (e) {
    return bffError(e);
  }
}

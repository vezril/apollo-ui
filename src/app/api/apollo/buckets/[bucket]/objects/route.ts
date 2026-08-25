import { apolloFetch } from "@/lib/apollo/server/client";
import { bffError, proxyJson } from "@/lib/apollo/server/http";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ bucket: string }> };

/** GET /api/apollo/buckets/{bucket}/objects?prefix=&pageToken= — list objects (read model). */
export async function GET(req: Request, { params }: Ctx) {
  try {
    const { bucket } = await params;
    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams();
    for (const k of ["prefix", "pageSize", "pageToken"]) {
      const v = searchParams.get(k);
      if (v) qs.set(k, v);
    }
    const suffix = qs.toString() ? `?${qs}` : "";
    return proxyJson(await apolloFetch(`/v1/buckets/${encodeURIComponent(bucket)}/objects${suffix}`));
  } catch (e) {
    return bffError(e);
  }
}

import { apolloFetch } from "@/lib/apollo/server/client";
import { bffError, proxyJson } from "@/lib/apollo/server/http";

export const runtime = "nodejs";

/** GET /api/apollo/buckets — list buckets (read model; eventually consistent). */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const qs = new URLSearchParams();
    const pageToken = searchParams.get("pageToken");
    const pageSize = searchParams.get("pageSize");
    if (pageToken) qs.set("pageToken", pageToken);
    if (pageSize) qs.set("pageSize", pageSize);
    const suffix = qs.toString() ? `?${qs}` : "";
    return proxyJson(await apolloFetch(`/v1/buckets${suffix}`));
  } catch (e) {
    return bffError(e);
  }
}

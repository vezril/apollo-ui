import "server-only";

import { NextResponse } from "next/server";

/**
 * ApolloStorage REST status → browser HTTP mapping for the BFF. Most statuses
 * pass through (409 already-exists, 400 bad name, 404 not found, 412 checksum
 * mismatch, 503 unavailable). 401/403 become 502: they mean the server-side
 * APOLLO_TOKEN is missing/unknown (401) or lacks the required scope (403) — an
 * operator misconfiguration, not a browser-user error.
 */
export function mapApolloStatus(status: number): number {
  return status === 401 || status === 403 ? 502 : status;
}

/** Turn an errored Apollo response into a mapped JSON error response. */
export async function apolloErrorResponse(res: Response): Promise<NextResponse> {
  const body = await res.text().catch(() => "");
  return NextResponse.json(
    { error: body || res.statusText, apolloStatus: res.status },
    { status: mapApolloStatus(res.status) }
  );
}

/** Forward a JSON Apollo response to the browser, or map an error to JSON. */
export async function proxyJson(res: Response, okStatus?: number): Promise<NextResponse> {
  if (!res.ok) return apolloErrorResponse(res);
  const status = okStatus ?? res.status;
  const contentType = res.headers.get("content-type") ?? "";
  if (res.status === 204 || !contentType.includes("application/json")) {
    return new NextResponse(null, { status });
  }
  return NextResponse.json(await res.json(), { status });
}

/** BFF error envelope for an unexpected/unreachable failure. */
export function bffError(e: unknown): NextResponse {
  return NextResponse.json(
    { error: e instanceof Error ? e.message : "Apollo BFF error", apolloStatus: 503 },
    { status: 502 }
  );
}

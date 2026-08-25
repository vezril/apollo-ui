import { NextResponse } from "next/server";

import { apolloFetch } from "@/lib/apollo/server/client";
import type { HealthStatus } from "@/lib/apollo/types";

export const runtime = "nodejs";

/** GET /api/apollo/health — ApolloStorage /health via the BFF. */
export async function GET() {
  try {
    const res = await apolloFetch("/health");
    const body = (await res.json().catch(() => null)) as HealthStatus | null;
    // Apollo returns 503 with a DOWN body while draining; surface both.
    return NextResponse.json(body ?? { status: "DOWN", service: "apollostorage", version: "?" }, {
      status: res.ok ? 200 : 200,
    });
  } catch {
    return NextResponse.json(
      { status: "DOWN", service: "apollostorage", version: "?" } satisfies HealthStatus,
      { status: 200 }
    );
  }
}

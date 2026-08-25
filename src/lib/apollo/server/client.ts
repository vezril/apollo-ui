import "server-only";

/**
 * Server-only ApolloStorage REST access for the BFF. Reads the endpoint and the
 * optional bearer token from server config and injects the token as an
 * `Authorization: Bearer` header. `APOLLO_TOKEN` never leaves the server (never
 * `NEXT_PUBLIC_*`); `import "server-only"` makes importing this from a client
 * component a build error. `path` is the full path from Apollo's root
 * (e.g. `/v1/buckets`, `/health`).
 */
function requireEndpoint(): string {
  const endpoint = process.env.APOLLO_ENDPOINT;
  if (!endpoint) {
    throw new Error("APOLLO_ENDPOINT is not set — the Apollo BFF cannot reach ApolloStorage");
  }
  return endpoint.replace(/\/$/, "");
}

export function apolloFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  const token = process.env.APOLLO_TOKEN;
  if (token) headers.set("authorization", `Bearer ${token}`);
  return fetch(`${requireEndpoint()}${path}`, { ...init, headers, cache: "no-store" });
}

/** Percent-encode each path segment of an object key while preserving '/'. */
export function encodeObjectPath(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

# Apollo UI

An operator console for **ApolloStorage** — browse buckets and objects, upload and download, and
watch health. Part of the Codex constellation, following the same per-service UI pattern as
`muses-ui` and `hermes-ui`.

It is a **BFF** (backend-for-frontend): the browser only ever talks to this app's own
`/api/apollo/*` routes; those run in the Next.js Node server and proxy ApolloStorage's REST API
server-side, so the endpoint and the optional `APOLLO_TOKEN` never reach the browser.

```
browser ──HTTP──▶ Next.js server ──/api/apollo/*──▶ ApolloStorage REST (/v1/…)
                     (this app)                        (http://apollo.apollo.svc:8080)
```

## What it does (v1)

- **Buckets** — list / create / delete (`/v1/buckets`)
- **Objects** — browse by prefix, upload (streamed → QuObjects), download, delete
- **Health** — live status pill (`/health`)

## Develop

```bash
npm install
APOLLO_ENDPOINT=http://localhost:8080 npm run dev   # point at a running Apollo
# open http://localhost:3000
npm run typecheck && npm run lint
```

Server-side env:

| var | purpose |
|-----|---------|
| `APOLLO_ENDPOINT` | Base URL of Apollo's REST API (required, server-side) |
| `APOLLO_TOKEN` | Optional bearer token (write scope for create/upload/delete) — a secret, never `NEXT_PUBLIC_*` |
| `NEXT_PUBLIC_APOLLO_API_BASE` | Same-origin BFF base, baked at build time (`/api/apollo`) |

## Deploy (Helm)

A published image (`calvinference/apolloui:X.Y.Z`) plus the chart under
[`deploy/charts/apollo`](deploy/charts/apollo). Point it at Apollo's in-cluster Service:

```bash
helm upgrade --install apollo-ui deploy/charts/apollo \
  --namespace apollo-ui --create-namespace \
  --set image.tag=0.1.0 \
  --set apollo.endpoint=http://apollo.apollo.svc.cluster.local:8080
```

For GitOps, copy [`deploy/flux/apollo-helmrelease.yaml`](deploy/flux/apollo-helmrelease.yaml) into the
Codex repo as `apps/apollo-ui/` (a `GitRepository` + `HelmRelease`), mirroring `apps/muses` /
`apps/hermes-ui`, and pin the released tag.

## Status

Working draft: production build green (TS + lint + standalone), Helm chart lints + renders, and the
BFF is smoke-tested end-to-end against the live Apollo (upload→QuObjects, download←QuObjects). CI
(`ci.yml`) and release (`release.yml` → `calvinference/apolloui`) workflows are in place.

Before first deploy:

- Add `DOCKERHUB_USERNAME` / `DOCKERHUB_TOKEN` repo secrets, then tag `v0.1.0` to publish the image.
- Wire `apps/apollo-ui/` into the Codex GitOps repo (see `deploy/flux/apollo-helmrelease.yaml`).

Known, deferred: `npm audit` flags a **postcss** advisory (build-time only — malicious `sourceMappingURL`
in attacker-controlled CSS, which this app never processes) bundled inside Next 15. The fix is a
breaking bump to Next 16; deferred as constellation-wide tech-debt to move all UIs together.

Later: object metadata view, a metrics / blob-GC admin surface.

# Apollo UI — multi-stage build producing a small standalone Next.js server image.
# The standalone server also hosts the Node-runtime BFF routes (/api/apollo/*)
# that proxy ApolloStorage's REST API (the optional APOLLO_TOKEN secret boundary).
# Published to Docker Hub as <user>/apolloui by the release workflow; deployed by
# Codex behind Traefik (+ cert-manager TLS once it exists).

# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- builder ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# NEXT_PUBLIC_* is inlined into the browser bundle at BUILD time (not read from
# the container env at runtime), so the same-origin BFF base must be baked here.
# The endpoint + APOLLO_TOKEN stay server-side (runtime env).
ENV NEXT_PUBLIC_APOLLO_API_BASE=/api/apollo
RUN npm run build

# ---- runner ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]

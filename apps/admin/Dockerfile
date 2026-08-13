# syntax=docker/dockerfile:1
# Omnia Platform — Admin + Payload CMS (apps/admin)
# Build context: repositório raiz
#   docker build -f apps/admin/Dockerfile .

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# ---------------------------------------------------------------------------
# Prune monorepo para @omnia/admin
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @omnia/admin --docker

# ---------------------------------------------------------------------------
# Install & build
# ---------------------------------------------------------------------------
FROM base AS installer
WORKDIR /app

COPY --from=builder /app/out/json/ .
COPY --from=builder /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

COPY --from=builder /app/out/full/ .

ARG NEXT_PUBLIC_APP_URL=https://dev.omniafrigo.com.br
ARG NEXT_PUBLIC_ADMIN_URL=https://admin.dev.omniafrigo.com.br
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ARG PAYLOAD_SECRET=staging-build-secret-min-32-chars-long
ARG GIT_SHA=unknown

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV DATABASE_URL=$DATABASE_URL
ENV PAYLOAD_SECRET=$PAYLOAD_SECRET
ENV NODE_ENV=production
ENV DOCKER_BUILD=true
ENV OMNIA_SMTP_ALLOW_BUILD=1

# Parity with CI: generated Payload types must exist before Next typecheck (R0.4).
RUN pnpm --filter @omnia/admin generate:types
RUN pnpm --filter @omnia/admin generate:importmap
RUN pnpm turbo build --filter=@omnia/admin

# ---------------------------------------------------------------------------
# Bootstrap (migrations + seed — one-off, NÃO usar em runtime)
# ---------------------------------------------------------------------------
FROM installer AS bootstrap
WORKDIR /app

RUN mkdir -p /app/apps/admin/src/seed/assets
COPY --from=builder /app/apps/web/public/og-default.png /app/apps/admin/src/seed/assets/blog-featured.png
COPY docker/scripts/admin-bootstrap.sh /usr/local/bin/omnia-admin-bootstrap.sh
RUN chmod +x /usr/local/bin/omnia-admin-bootstrap.sh

ENV NODE_ENV=production

ENTRYPOINT ["/usr/local/bin/omnia-admin-bootstrap.sh"]
CMD ["bootstrap"]

# ---------------------------------------------------------------------------
# Runtime (Next.js standalone)
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ARG GIT_SHA=unknown
ENV GIT_SHA=$GIT_SHA
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Payload media uploads (volume mount em staging)
RUN mkdir -p /app/media && chown nextjs:nodejs /app/media

COPY --from=installer /app/apps/admin/public ./apps/admin/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs
EXPOSE 3000

VOLUME ["/app/media"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/admin/server.js"]

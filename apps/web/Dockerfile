# syntax=docker/dockerfile:1
# Omnia Platform — Portal (apps/web)
# Build context: repositório raiz
#   docker build -f apps/web/Dockerfile .

FROM node:22-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# ---------------------------------------------------------------------------
# Prune monorepo para @omnia/web
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY . .
RUN pnpm dlx turbo prune @omnia/web --docker

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
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_ADMIN_URL=$NEXT_PUBLIC_ADMIN_URL
ENV NODE_ENV=production
ENV DOCKER_BUILD=true

RUN pnpm turbo build --filter=@omnia/web

# ---------------------------------------------------------------------------
# Runtime (Next.js standalone)
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

COPY --from=installer /app/apps/web/public ./apps/web/public
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=installer --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "apps/web/server.js"]

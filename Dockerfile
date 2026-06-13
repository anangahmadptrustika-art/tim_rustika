# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# Rustika PMS — multi-stage production image
# ---------------------------------------------------------------------------

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

# ---- deps: install all dependencies (cached) ------------------------------
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: generate Prisma client & build Next ------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
RUN npm run build

# ---- runner: runtime image -----------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# The custom server (server.js) requires `next`, `socket.io` and their deps,
# which Next's `output: standalone` tracing does NOT include (it only traces the
# app code, not server.js). So ship the full, already-built node_modules from
# the builder — it also contains the generated Prisma client and the prisma CLI.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js

USER nextjs
EXPOSE 3000
ENV PORT=3000 HOSTNAME=0.0.0.0

# server.js boots Next + Socket.IO together
CMD ["node", "server.js"]

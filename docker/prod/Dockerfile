FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Copy package files (including lockfile) and install full deps for build
COPY package*.json ./
COPY package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy tsconfig and source, then build
COPY tsconfig*.json ./
COPY src/ ./src/
RUN npm run build

# Remove devDependencies to keep only production deps
RUN npm prune --production

FROM node:22-bookworm-slim AS production

LABEL maintainer="Whispr Team" \
    service="users-service" \
    version="1.0.0" \
    environment="production" \
    cloud.provider="gcp" \
    org.opencontainers.image.source="https://github.com/whispr-messenger/user-service" \
    org.opencontainers.image.description="Whispr User Service" \
    org.opencontainers.image.licenses="MIT" \
    security.scan="enabled" \
    optimization.level="production" \
    gcp.cloud-run="compatible" \
    gcp.gke="compatible" \
    monitoring.prometheus="enabled"

# Patch CVE-2026-28390 (libssl3) and other security updates, then strip npm
# (not needed at runtime) to remove its transitive CVEs from the scan surface
RUN apt-get update \
    && apt-get install -y --no-install-recommends --only-upgrade libssl3 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/* \
    && rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx

WORKDIR /app

# Copy built application and production deps from builder (node user uid 1000 ships with node:slim)
COPY --from=builder --chown=1000:1000 /app/node_modules ./node_modules
COPY --from=builder --chown=1000:1000 /app/dist ./dist
COPY --from=builder --chown=1000:1000 /app/package.json ./

# Run as the non-root node user shipped with the image
USER 1000

ENV NODE_ENV=production

# Expose ports (documentation only)
EXPOSE 3001 50051

# Health check (ensure dist/docker/health-check.js is produced by build)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["node", "dist/docker/health-check.js"]

# Start the application with environment checks (use compiled TS in dist)
ENTRYPOINT ["node"]
CMD ["dist/docker/entrypoint.js"]


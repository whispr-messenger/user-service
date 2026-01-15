FROM node:22-alpine AS builder

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

FROM gcr.io/distroless/nodejs22-debian12 AS production

LABEL maintainer="Whisper Team" \
    service="users-service" \
    version="1.0.0" \
    environment="production" \
    cloud.provider="gcp" \
    org.opencontainers.image.source="https://github.com/whisper/user-service" \
    org.opencontainers.image.description="Whisper Authentication Service" \
    org.opencontainers.image.licenses="MIT" \
    security.scan="enabled" \
    optimization.level="production" \
    gcp.cloud-run="compatible" \
    gcp.gke="compatible" \
    monitoring.prometheus="enabled"


WORKDIR /app

# Copy built application and production deps from builder
# Use numeric UID/GID 65532 for nonroot in distroless images
COPY --from=builder --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=builder --chown=65532:65532 /app/dist ./dist
COPY --from=builder --chown=65532:65532 /app/package*.json ./

# Run as non-root (distroless typically maps to uid 65532)
USER 65532

ENV NODE_ENV=production

# Expose ports (documentation only)
EXPOSE 3001 50051

# Health check (ensure dist/docker/health-check.js is produced by build)
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD ["dist/docker/health-check.js"]

# Start the application with environment checks (use compiled TS in dist)
# Note: distroless images have 'node' as default ENTRYPOINT, so we only specify the script
CMD ["dist/docker/entrypoint.js"]


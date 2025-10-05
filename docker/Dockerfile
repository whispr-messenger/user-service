FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
# Install all dependencies but ignore postinstall scripts (just-install)
RUN npm ci --ignore-scripts

COPY . .
RUN npm run build

# Install only production dependencies for runtime
RUN npm ci --only=production --ignore-scripts && npm cache clean --force

FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/package*.json ./

USER nestjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/health-check.js || exit 1

CMD ["node", "dist/main"]
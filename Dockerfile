# FeexSystems Enterprise Production Dockerfile
# Optimized for Google Cloud Run & Container Runtimes

# ==========================================
# Stage 1: Build & Assets Compilation
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install native dependencies required for build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    openssl

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies with npm install to handle package-lock sync
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Copy application source code
COPY . .

# Build Vite client (dist/spa) and server bundle (dist/server)
RUN npm run build

# Prune devDependencies to keep final image small
RUN npm prune --production

# ==========================================
# Stage 2: Production Minimal Runtime
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

# Install lightweight runtime utilities and security tools
RUN apk add --no-cache \
    dumb-init \
    openssl \
    ca-certificates

ENV NODE_ENV=production
ENV PORT=8080

# Create dedicated non-root execution user and group
RUN addgroup -g 1001 -S feexgroup && \
    adduser -S feexuser -u 1001 -G feexgroup

# Copy compiled bundles and pruned production node_modules
COPY --from=builder --chown=feexuser:feexgroup /app/dist ./dist
COPY --from=builder --chown=feexuser:feexgroup /app/node_modules ./node_modules
COPY --from=builder --chown=feexuser:feexgroup /app/package.json ./package.json
COPY --from=builder --chown=feexuser:feexgroup /app/prisma ./prisma
COPY --from=builder --chown=feexuser:feexgroup /app/public ./public

# Prepare local storage & temp directories with non-root ownership
RUN mkdir -p /app/uploads /app/temp && chown -R feexuser:feexgroup /app/uploads /app/temp

# Switch to non-root user
USER feexuser

# Expose standard Cloud Run port
EXPOSE 8080

# Health check for Cloud Run liveness probing
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Signal-aware entrypoint
ENTRYPOINT ["dumb-init", "--"]

# Start production server
CMD ["npm", "start"]

# ── Stage 1: Install production dependencies ─────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files first for better Docker layer caching
COPY package.json package-lock.json ./

# Install only production dependencies; clean npm cache
RUN npm ci --only=production && npm cache clean --force

# ── Stage 2: Production runtime ──────────────────────────────────────
FROM node:20-alpine AS runtime

# Security: run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S xploitverse -u 1001 -G nodejs

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps --chown=xploitverse:nodejs /app/node_modules ./node_modules

# Copy application source
COPY --chown=xploitverse:nodejs src/ ./src/
COPY --chown=xploitverse:nodejs package.json ./

# Switch to non-root user
USER xploitverse

# Expose the default API port
EXPOSE 5000

# Health check — lightweight wget against /health
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "src/index.js"]

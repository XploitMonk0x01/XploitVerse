# syntax=docker/dockerfile:1.7
# ==========================================
# XploitVerse Go Backend - Multi-stage Build
# ==========================================

# ── Stage 1: Build ───────────────────────
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build essentials and certs
RUN apk add --no-cache git ca-certificates tzdata

# Cache Go modules
COPY go.mod go.sum ./
RUN go mod download

# Copy application source
COPY . .

# Build static binary with compiler optimizations
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags="-s -w -extldflags '-static'" \
    -o /app/server cmd/server/main.go

# ── Stage 2: Runtime ─────────────────────
FROM alpine:3.21 AS runner

# Create non-root system user
RUN addgroup -g 10001 -S appgroup && \
    adduser -u 10001 -S appuser -G appgroup

# Install runtime dependencies (curl, ca-certificates, docker CLI for container orchestration)
RUN apk add --no-cache ca-certificates tzdata docker-cli curl

WORKDIR /app

# Copy binary from builder stage
COPY --from=builder /app/server /app/server

# Change ownership
USER appuser:appgroup

# Configuration
ENV GIN_MODE=release \
    PORT=5000

EXPOSE 5000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:5000/health || exit 1

ENTRYPOINT ["/app/server"]

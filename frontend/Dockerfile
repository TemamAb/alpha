# AlphaMark Monitoring Dashboard Dockerfile
# Node 20 to satisfy chokidar/readdirp engine requirements
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency definitions first
COPY frontend/package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy frontend app source
COPY frontend/. .

# Build the React app
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install serve to serve static files
RUN npm install -g serve

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/ || exit 1

# Serve the built React app
CMD ["serve", "-s", "dist", "-l", "3000"]

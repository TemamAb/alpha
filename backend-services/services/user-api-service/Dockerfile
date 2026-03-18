# Use official Node.js 18 image as base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install production dependencies
# We copy package.json first to leverage Docker cache
COPY package*.json ./

# Install dependencies including redis for state management
RUN npm install --production && npm install redis

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "src/index.js"]
# Alpha-Orion Frontend Dockerfile
# Optimized for static HTML dashboard with nginx
# No build step needed - serves official-dashboard.html directly

# Production stage
FROM nginx:alpine

# Set nginx to listen on port 8080 for Cloud Run
ENV PORT=8080

# Copy nginx configuration
COPY docker/nginx.conf /etc/nginx/nginx.conf

# Copy the entrypoint script
COPY docker/frontend-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Copy the official dashboard HTML file
COPY official-dashboard.html /usr/share/nginx/html/official-dashboard.html

# Create a simple index.html that redirects to dashboard
RUN echo '<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=/official-dashboard.html"></head></html>' > /usr/share/nginx/html/index.html

# Expose port 8080 for Cloud Run
EXPOSE 8080

# Use entrypoint script for API URL configuration
ENTRYPOINT ["/entrypoint.sh"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

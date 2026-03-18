# Use Node.js 18 (Debian-based) as the base image
FROM node:18-slim

# Install Python 3, pip, and build tools
RUN apt-get update && \
    apt-get install -y python3 python3-pip python3-venv git build-essential && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy dependency definitions first (layer caching)
COPY package.json requirements.txt ./

# Install Node.js dependencies
RUN npm install --production

# Install Python dependencies
# --break-system-packages is safe here as we are in an isolated container
RUN pip3 install -r requirements.txt --break-system-packages

# Copy the rest of the application code
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DASHBOARD_URL=http://localhost:3000
ENV PYTHONUNBUFFERED=1

# Expose the web port
EXPOSE 3000

# Start both processes via the start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

CMD ["/app/start.sh"]
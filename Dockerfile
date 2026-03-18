# Stage 1: Build the React frontend
FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Create the production image
FROM node:18-alpine
WORKDIR /app
COPY backend/package.json backend/package-lock.json* ./
RUN npm install --production
COPY backend/. .
COPY --from=build /app/dist ./dist
EXPOSE 8080
CMD [ "node", "server.js" ]
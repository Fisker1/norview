# ---- Build stage ----
FROM node:20-alpine AS build

WORKDIR /app

# Install root dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Install server dependencies
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci

# Copy source and build
COPY . .
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Install only production deps for the server
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy built frontend + server code
COPY --from=build /app/dist ./dist
COPY server/index.js ./server/

# Lightweight static file server that also proxies /api
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000

CMD ["/docker-entrypoint.sh"]

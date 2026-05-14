# ---- Build stage ----
FROM node:20-alpine AS build

# better-sqlite3 needs build tools
RUN apk add --no-cache python3 make g++

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

# better-sqlite3 needs native bindings at runtime
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Install only production deps for the server
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# Copy built frontend + server code + production serve script
COPY --from=build /app/dist ./dist
COPY server/index.js ./server/
COPY server/recorder.js ./server/
COPY docker-serve.js ./docker-serve.js
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

CMD ["/docker-entrypoint.sh"]

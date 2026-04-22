# Stage 1: Build dependencies
FROM node:18-alpine AS builder
RUN apk add --no-cache curl
WORKDIR /app

COPY package*.json ./

# Set high timeout and retries for npm to handle unstable connections
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 300000

# Leverage persistent cache for npm downloads using npm ci
RUN --mount=type=cache,target=/root/.npm \
    npm ci --loglevel error || (sleep 10 && npm ci --loglevel error)

# Stage 2: Production image
FROM node:18-alpine
RUN apk add --no-cache curl
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 5000

CMD ["node", "index.js"]

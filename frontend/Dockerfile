FROM node:20-alpine

WORKDIR /app

# Copy package files first to leverage cache
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm config set fetch-timeout 600000 \
    && npm config set fetch-retries 10 \
    && npm config set fetch-retry-mintimeout 20000 \
    && npm config set fetch-retry-maxtimeout 120000 \
    && npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

# Build the Next.js application
RUN npm run build

EXPOSE 3000

# Start the application in production mode
CMD ["npm", "start"]

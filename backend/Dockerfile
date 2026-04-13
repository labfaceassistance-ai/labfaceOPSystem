FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

# Set high timeout and retries for npm to handle unstable connections (WSL network resets)
RUN npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retries 10 && \
    npm config set fetch-timeout 300000 && \
    npm install --loglevel error || (sleep 10 && npm install --loglevel error)

COPY . .

EXPOSE 5000

CMD ["npm", "start"]

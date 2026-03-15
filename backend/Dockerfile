FROM node:18-alpine

# Install curl for healthcheck
RUN apk add --no-cache curl

WORKDIR /app

COPY package*.json ./

RUN npm config set fetch-timeout 300000 && npm config set fetch-retries 5 && npm install

COPY . .

EXPOSE 5000

CMD ["npm", "start"]

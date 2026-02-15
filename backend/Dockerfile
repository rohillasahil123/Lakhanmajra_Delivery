FROM node:18-alpine

WORKDIR /app

# Dependencies install
COPY package*.json ./
RUN npm install

# TypeScript code copy
COPY . .

# Build TypeScript
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
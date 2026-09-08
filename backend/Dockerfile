FROM node:24-alpine

WORKDIR /app
COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci
COPY . .

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "server.js"]

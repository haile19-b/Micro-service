FROM node:20-alpine
WORKDIR /usr/src/app

COPY package*.json tsconfig.json ./
RUN npm ci

COPY prisma/ ./prisma/
RUN npx prisma generate

COPY src/ ./src/

EXPOSE 3002

CMD ["npx", "tsx", "src/server.ts"]
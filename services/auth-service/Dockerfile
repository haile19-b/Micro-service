# --- STAGE 1: BUILD ---
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package config files
COPY package*.json tsconfig.json ./

# Install all dependencies (including devDependencies)
RUN npm ci

# Copy Prisma schema and generate the database client
COPY prisma/ ./prisma/
RUN npx prisma generate

# Copy source files
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Prune development dependencies
RUN npm prune --production

# --- STAGE 2: RUNTIME ---
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy compiled files, production node_modules, and generated prisma clients
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/src/generated ./src/generated

# IMPORTANT: Change this to 3001 for auth, 3002 for product, 3003 for order
EXPOSE 3001

CMD ["node", "dist/server.js"]
# --- STAGE 1: BUILD ---
FROM node:20-alpine AS builder
WORKDIR /usr/src/app

# Copy package config files
COPY package*.json tsconfig.json ./

# Install dependencies (including devDependencies to compile ts)
RUN npm ci

# Copy source files
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# Prune development dependencies to keep final image clean
RUN npm prune --production

# --- STAGE 2: RUNTIME ---
FROM node:20-alpine AS runner
WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built code and production node_modules from builder stage
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package*.json ./

EXPOSE 3000

CMD ["node", "dist/server.js"]
# Multi-stage Dockerfile for TriModal_Server
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy config and lockfiles
COPY package.json pnpm-lock.yaml* ./

# Install all dependencies (including devDependencies)
RUN pnpm install --frozen-lockfile

# Copy source code and config
COPY . .

# Run build script to bundle using esbuild
RUN pnpm run build

# Runner stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package info and lockfile
COPY package.json pnpm-lock.yaml* ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy compiled code from builder
COPY --from=builder /app/dist ./dist

# Set default port (will be overridden by Cloud Run)
ENV PORT=5000
EXPOSE 5000

# Run the bundled backend server
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]

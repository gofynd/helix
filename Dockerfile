# Multi-stage Dockerfile for Fynd Storefront SSR
# Optimized for Cloudflare Container deployment

# ---- Stage 1: Dependencies ----
FROM node:18-alpine AS deps
WORKDIR /app

# Install system dependencies needed for node-gyp and native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat \
    && ln -sf python3 /usr/bin/python

# Copy package files for dependency installation (explicit to ensure lockfile is present)
COPY package.json package-lock.json ./

# Install all dependencies (dev + prod) for build stage using lockfile for reproducibility
RUN npm ci --no-audit --no-fund

# ---- Stage 2: Builder ----
FROM node:18-alpine AS builder
WORKDIR /app

# No native builds needed at this step; keep image slim
RUN apk add --no-cache libc6-compat

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
#Ensure tsconfig is available for path alias resolution
COPY tsconfig.json ./

# Copy source code and configuration files
COPY . .

# Create public/css directory for build scripts
RUN mkdir -p public/css

# Build the application step by step for better debugging
RUN npm run build:tailwind
# Compile TS and then fix path aliases in emitted JS
RUN npx tsc && npx tsc-alias
RUN npm run build:styles  
RUN npm run build:optimize

# ---- Stage 3: Production ----
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S fynd -u 1001

# Install only production runtime dependencies via lockfile
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder --chown=fynd:nodejs /app/dist ./dist
COPY --from=builder --chown=fynd:nodejs /app/public ./public
# Copy Nunjucks templates to dist/views where the app expects them (__dirname + '/views')
COPY --from=builder --chown=fynd:nodejs /app/src/views ./dist/views

# Create necessary directories and set permissions
RUN mkdir -p /app/logs && \
    chown -R fynd:nodejs /app

# Switch to non-root user
USER fynd

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Expose port
EXPOSE 8080

# Start the application
CMD ["node", "dist/server.js"]

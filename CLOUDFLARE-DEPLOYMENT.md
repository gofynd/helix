# Cloudflare Container Deployment Guide

This guide explains how to deploy any containerized application to Cloudflare Containers using Wrangler and Docker.

## Overview

Cloudflare Containers allow you to run containerized applications on Cloudflare's edge network. This setup uses:
- **Docker** for containerizing your application
- **Wrangler** for deployment and configuration
- **Cloudflare Workers** as a proxy to route traffic to your container
- **Durable Objects** to manage container instances

## Prerequisites

- Node.js 18+ and npm (for Wrangler CLI)
- Docker installed locally
- Cloudflare account with Workers/Containers enabled
- Wrangler CLI: `npm install -g wrangler`

## Project Structure

```
├── Dockerfile                 # Container configuration
├── wrangler.toml             # Cloudflare deployment config
├── src/
│   └── cf-worker.js          # Worker proxy for container routing
├── package.json              # (if using Node.js)
└── ... (your application)
```

## Required Files

### 1. Dockerfile

Your existing Dockerfile should be optimized for Cloudflare Containers:

```dockerfile
# Multi-stage Dockerfile for Cloudflare Container deployment
FROM node:18-alpine AS deps
WORKDIR /app

# Install system dependencies (adjust based on your needs)
RUN apk add --no-cache python3 make g++ libc6-compat

# Copy package files (if using Node.js)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --no-audit --no-fund

# Build stage
FROM node:18-alpine AS builder
WORKDIR /app

# Copy dependencies and source
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package*.json ./
COPY . .

# Build your application (customize these steps)
RUN npm run build

# Production stage
FROM node:18-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S appuser -u 1001

# Install production dependencies (if using Node.js)
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy built application
COPY --from=builder --chown=appuser:nodejs /app/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/public ./public

# Set permissions
RUN mkdir -p /app/logs && chown -R appuser:nodejs /app
USER appuser

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => { process.exit(1) })"

EXPOSE 8080
CMD ["node", "dist/server.js"]
```

**Key Requirements:**
- App must listen on `0.0.0.0:8080`
- Include health check endpoint at `/health`
- Use non-root user for security
- Optimize for production (multi-stage builds, minimal dependencies)

### 2. wrangler.toml

Configuration file for Cloudflare deployment:

```toml
name = "your-app-name"
main = "src/cf-worker.js"
compatibility_date = "2025-09-09"

[observability]
logs = { enabled = true }

[[containers]]
class_name = "MyContainer"
image = { dockerfile = "./Dockerfile" }
max_instances = 2

[[durable_objects.bindings]]
name = "MY_CONTAINER"
class_name = "MyContainer"

[[migrations]]
tag = "v1"
new_classes = ["MyContainer"]

# Optional: Custom domain
[[routes]]
pattern = "your-domain.com/*"
zone_name = "your-domain.com"
```

**Configuration Notes:**
- `class_name` must match the class name in `cf-worker.js`
- `image` uses Dockerfile for local builds
- `max_instances` limits concurrent containers
- `durable_objects.bindings` creates the container binding
- `migrations` enables containers for the Durable Object class

### 3. src/cf-worker.js

Worker script that proxies requests to your container:

```javascript
import { Container } from "@cloudflare/containers";
import { env as workerEnv } from "cloudflare:workers";

export class MyContainer extends Container {
  defaultPort = 8080;   // Your app listens on port 8080
  sleepAfter = "10m";   // Stop container after 10 minutes of inactivity
  
  // Container resource limits
  cpu = "1000m";        // 1 CPU core
  memory = "1Gi";       // 1GB memory
  
  // Environment variables for the container
  envVars = {
    NODE_ENV: "production",
    HOST: "0.0.0.0",
    PORT: "8080",
    // Pass secrets from Worker environment to container
    API_BASE_URL: workerEnv.API_BASE_URL,
    AUTH_TOKEN: workerEnv.AUTH_TOKEN,
    DATABASE_URL: workerEnv.DATABASE_URL,
    // Add any other environment variables your app needs
  };
}

export default {
  async fetch(request, env) {
    try {
      // Health check for Worker
      const { pathname } = new URL(request.url);
      if (pathname === '/__worker_ok') {
        return new Response('worker: ok', { status: 200 });
      }

      // Get container instance
      const container = env.MY_CONTAINER.getByName("default");
      
      // Forward request to your app
      const response = await container.fetch(request);
      
      // Add debugging headers
      const headers = new Headers(response.headers);
      headers.set('X-Container-Instance', 'your-app-name');
      headers.set('X-Powered-By', 'Cloudflare-Containers');
      
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers
      });
      
    } catch (error) {
      console.error('Container fetch error:', error);
      
      return new Response(
        JSON.stringify({
          error: 'Container service unavailable',
          message: error.message,
          timestamp: new Date().toISOString()
        }), 
        {
          status: 503,
          headers: {
            'Content-Type': 'application/json',
            'X-Error-Source': 'cf-worker'
          }
        }
      );
    }
  }
};
```

**Key Points:**
- `defaultPort` must match your app's port (8080)
- `envVars` passes environment variables to the container
- Worker acts as a proxy between Cloudflare and your container
- Error handling for container unavailability

## Deployment Steps

### 1. Prepare Environment

```bash
# Install Wrangler globally
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Verify your account
wrangler whoami
```

### 2. Set Secrets

Set required environment variables as Cloudflare secrets:

```bash
# Set your API credentials
npx wrangler secret put API_BASE_URL
npx wrangler secret put AUTH_TOKEN


**How Secrets Work:**
- Secrets are encrypted and stored securely in Cloudflare
- They're accessible in your Worker via `workerEnv.SECRET_NAME`
- The Worker passes them to the container via `envVars`
- Your application can access them as regular environment variables

### 3. Deploy

```bash
# Deploy to Cloudflare
npx wrangler deploy

# Accept the Durable Object migration when prompted
# This enables containers for your Worker
```

### 4. Verify Deployment

Test your deployment:

```bash
# Test Worker routing
curl https://your-app-name.your-subdomain.workers.dev/__worker_ok
# Should return: worker: ok

# Test container health
curl https://your-app-name.your-subdomain.workers.dev/health
# Should return: {"status":"healthy",...}

# Test your app
curl https://your-app-name.your-subdomain.workers.dev/
# Should return your homepage
```

## Monitoring and Debugging

### View Logs

```bash
# Real-time logs
wrangler tail

# Logs with filtering
wrangler tail --format=pretty
```

### Common Issues

1. **"Containers have not been enabled"**
   - Run `wrangler deploy` and accept the migration prompt
   - Ensure `[[migrations]]` section exists in `wrangler.toml`

2. **Container not starting**
   - Check environment variables are set correctly
   - Verify your app listens on `0.0.0.0:8080`
   - Check container logs in Cloudflare dashboard

3. **Template not found errors**
   - Ensure templates are copied to the correct location in Dockerfile
   - Verify template path resolution in your application

4. **API errors**
   - Verify `AUTH_TOKEN` is valid
   - Check `API_BASE_URL` matches your environment
   - Ensure all required secrets are set

### Performance Optimization

1. **Container Resources**
   - Adjust `cpu` and `memory` in `cf-worker.js` based on needs
   - Monitor usage in Cloudflare dashboard

2. **Caching**
   - Implement proper cache headers in your Express app
   - Use Cloudflare's edge caching for static assets

3. **Cold Starts**
   - Set appropriate `sleepAfter` timeout
   - Consider keeping containers warm for critical paths

## Environment Variables

### Container Environment Variables
These are automatically set by the Worker and passed to your container:

- `NODE_ENV` - Set to "production" (default in cf-worker.js)
- `PORT` - Set to 8080 (default in cf-worker.js)
- `HOST` - Set to "0.0.0.0" (default in cf-worker.js)

### Secrets (set via `wrangler secret put`)
These are encrypted and passed from Worker to container:

- `API_BASE_URL` - Your API endpoint
- `AUTH_TOKEN` - Authentication token

### How to Access Secrets in Your Application

**In Node.js/Express:**
```javascript
const apiUrl = process.env.API_BASE_URL;
const authToken = process.env.AUTH_TOKEN;
const dbUrl = process.env.DATABASE_URL;
```

**In Python:**
```python
import os
api_url = os.getenv('API_BASE_URL')
auth_token = os.getenv('AUTH_TOKEN')
db_url = os.getenv('DATABASE_URL')
```

**In Go:**
```go
apiUrl := os.Getenv("API_BASE_URL")
authToken := os.Getenv("AUTH_TOKEN")
dbUrl := os.Getenv("DATABASE_URL")
```

## Custom Domain Setup

1. Add your domain to Cloudflare
2. Update `wrangler.toml`:

```toml
[[routes]]
pattern = "your-domain.com/*"
zone_name = "your-domain.com"
```

3. Deploy: `wrangler deploy`

## Troubleshooting

### Check Container Status
```bash
# View container instances
wrangler tail --format=pretty | grep "container"
```

### Debug Worker Issues
```bash
# Test Worker directly
curl -v https://your-app-name.your-subdomain.workers.dev/__worker_ok
```

### Container Logs
- Use `wrangler tail` for real-time logs
- Check Cloudflare dashboard for container metrics
- Verify environment variables are set correctly

## Best Practices

1. **Security**
   - Use non-root user in Dockerfile
   - Set proper security headers
   - Validate all inputs

2. **Performance**
   - Optimize Docker image size
   - Use multi-stage builds
   - Implement proper caching
   - Use appropriate base images for your language/framework

3. **Monitoring**
   - Enable observability in `wrangler.toml`
   - Use structured logging
   - Set up alerts for errors

4. **Development**
   - Test locally with Docker first
   - Use staging environment before production
   - Keep secrets secure
   - Use environment-specific configurations

## Support

- [Cloudflare Workers Documentation](https://developers.cloudflare.com/workers/)
- [Cloudflare Containers Documentation](https://developers.cloudflare.com/containers/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

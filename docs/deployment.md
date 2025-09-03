# Deployment Guide

This guide covers deploying the Fynd Storefront SSR to various platforms and environments.

## Prerequisites

Before deploying, ensure you have:

- ✅ **Fynd Platform Account** with valid Application Key and Token
- ✅ **Environment Variables** configured
- ✅ **Production Build** tested locally
- ✅ **Domain Name** (optional, for custom domains)

## Quick Production Setup

### 1. Build for Production

```bash
# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Start production server
NODE_ENV=production npm start
```

### 2. Environment Configuration

Create a production `.env` file:

```env
# Required
NODE_ENV=production
FYND_APPLICATION_KEY=your_production_key
FYND_APPLICATION_TOKEN=your_production_token

# Server Configuration
PORT=3000
HOST=0.0.0.0
TRUST_PROXY=true

# Performance
CACHE_TTL_SECONDS=600
CACHE_MAX_SIZE=2000
REQUEST_TIMEOUT_MS=5000

# Logging
LOG_LEVEL=warn
PRETTY_LOGS=false

# Security
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
```

## Platform Deployments

### 🚀 Render (Recommended)

Render provides zero-config deployment with automatic HTTPS and global CDN.

#### Setup Steps:

1. **Connect Repository**
   - Go to [Render Dashboard](https://dashboard.render.com)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository

2. **Configure Service**
   ```yaml
   # render.yaml
   services:
     - type: web
       name: fynd-storefront
       env: node
       buildCommand: npm ci && npm run build
       startCommand: npm start
       envVars:
         - key: NODE_ENV
           value: production
         - key: FYND_APPLICATION_KEY
           sync: false  # Set in Render dashboard
         - key: FYND_APPLICATION_TOKEN
           sync: false  # Set in Render dashboard
   ```

3. **Environment Variables**
   - Add your Fynd credentials in Render dashboard
   - Set other production environment variables

4. **Deploy**
   - Render automatically deploys on git push
   - Access your app at `https://your-app.onrender.com`

#### Performance Tips:
- Enable HTTP/2 (automatic on Render)
- Use Render's global CDN for static assets
- Configure custom domain for better performance

---

### ☁️ Google Cloud Run

Serverless container deployment with automatic scaling.

#### Setup Steps:

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   WORKDIR /app
   
   # Copy package files
   COPY package*.json ./
   RUN npm ci --only=production
   
   # Copy built application
   COPY dist/ ./dist/
   COPY public/ ./public/
   COPY src/views/ ./dist/views/
   
   # Create non-root user
   RUN addgroup -g 1001 -S nodejs
   RUN adduser -S nextjs -u 1001
   USER nextjs
   
   EXPOSE 3000
   CMD ["node", "dist/server.js"]
   ```

2. **Build and Push Container**
   ```bash
   # Build container
   docker build -t gcr.io/YOUR_PROJECT/fynd-storefront .
   
   # Push to Google Container Registry
   docker push gcr.io/YOUR_PROJECT/fynd-storefront
   ```

3. **Deploy to Cloud Run**
   ```bash
   gcloud run deploy fynd-storefront \
     --image gcr.io/YOUR_PROJECT/fynd-storefront \
     --platform managed \
     --region us-central1 \
     --allow-unauthenticated \
     --set-env-vars NODE_ENV=production \
     --set-env-vars FYND_APPLICATION_KEY=your_key \
     --set-env-vars FYND_APPLICATION_TOKEN=your_token \
     --memory 1Gi \
     --cpu 1 \
     --max-instances 10
   ```

#### Configuration:
- **Memory**: 1GB recommended
- **CPU**: 1 vCPU for most workloads
- **Concurrency**: 80-100 requests per instance
- **Timeout**: 300 seconds for long requests

---

### 🪂 Fly.io

Global edge deployment with excellent performance.

#### Setup Steps:

1. **Install Fly CLI**
   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Initialize Fly App**
   ```bash
   fly launch --no-deploy
   ```

3. **Configure fly.toml**
   ```toml
   app = "your-fynd-storefront"
   
   [build]
     builder = "heroku/buildpacks:20"
   
   [env]
     NODE_ENV = "production"
     PORT = "8080"
   
   [[services]]
     internal_port = 8080
     protocol = "tcp"
   
     [[services.ports]]
       handlers = ["http"]
       port = "80"
   
     [[services.ports]]
       handlers = ["tls", "http"]
       port = "443"
   
   [[services.http_checks]]
     interval = 10000
     grace_period = "5s"
     method = "get"
     path = "/health"
     protocol = "http"
     timeout = 2000
   ```

4. **Set Environment Variables**
   ```bash
   fly secrets set FYND_APPLICATION_KEY=your_key
   fly secrets set FYND_APPLICATION_TOKEN=your_token
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

#### Features:
- Global edge locations
- Automatic SSL certificates
- Built-in load balancing
- Zero-downtime deployments

---

### 🟣 Heroku

Traditional PaaS deployment.

#### Setup Steps:

1. **Create Heroku App**
   ```bash
   heroku create your-fynd-storefront
   ```

2. **Configure Buildpacks**
   ```bash
   heroku buildpacks:set heroku/nodejs
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set FYND_APPLICATION_KEY=your_key
   heroku config:set FYND_APPLICATION_TOKEN=your_token
   ```

4. **Configure package.json**
   ```json
   {
     "scripts": {
       "heroku-postbuild": "npm run build",
       "start": "node dist/server.js"
     },
     "engines": {
       "node": "18.x",
       "npm": "9.x"
     }
   }
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

---

### 🖥️ VPS/EC2 Deployment

Traditional server deployment with PM2 process manager.

#### Setup Steps:

1. **Server Setup**
   ```bash
   # Install Node.js 18
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2
   sudo npm install -g pm2
   ```

2. **Deploy Application**
   ```bash
   # Clone repository
   git clone your-repo.git
   cd fynd-storefront-ssr
   
   # Install dependencies and build
   npm ci --only=production
   npm run build
   ```

3. **PM2 Configuration**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'fynd-storefront',
       script: 'dist/server.js',
       instances: 'max',
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3000
       },
       env_production: {
         NODE_ENV: 'production',
         FYND_APPLICATION_KEY: 'your_key',
         FYND_APPLICATION_TOKEN: 'your_token'
       }
     }]
   };
   ```

4. **Start with PM2**
   ```bash
   pm2 start ecosystem.config.js --env production
   pm2 save
   pm2 startup
   ```

5. **Nginx Configuration**
   ```nginx
   server {
     listen 80;
     server_name yourdomain.com;
     
     location / {
       proxy_pass http://localhost:3000;
       proxy_http_version 1.1;
       proxy_set_header Upgrade $http_upgrade;
       proxy_set_header Connection 'upgrade';
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_cache_bypass $http_upgrade;
     }
     
     location /static {
       alias /path/to/your/app/public;
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

## Performance Optimization

### 1. **CDN Configuration**

For static assets, configure CDN:

```javascript
// In production, serve static files from CDN
const staticUrl = process.env.CDN_URL || '/static';

app.use('/static', express.static('public', {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));
```

### 2. **Compression**

Enable compression in production:

```javascript
// Already configured in app.ts
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));
```

### 3. **Database Connection Pooling**

For production databases:

```javascript
// Configure connection pooling
const apolloClient = new ApolloClient({
  link: createHttpLink({
    uri: process.env.FYND_API_BASE_URL,
    fetch: fetch,
    fetchOptions: {
      timeout: 10000,
      // Connection pooling handled by HTTP client
    }
  })
});
```

## Monitoring Setup

### 1. **Health Checks**

Configure health check endpoint:

```javascript
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version,
    environment: process.env.NODE_ENV
  });
});
```

### 2. **Logging**

Production logging configuration:

```javascript
// Production logger config
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty'
    }
  }),
  // Add request correlation
  serializers: {
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err
  }
});
```

### 3. **Error Tracking**

Integrate with error tracking services:

```javascript
// Example: Sentry integration
if (process.env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1
  });
  
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.errorHandler());
}
```

## SSL/HTTPS Setup

### 1. **Let's Encrypt (Free SSL)**

For VPS deployments:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. **CloudFlare SSL**

For additional security and performance:

1. Add your domain to CloudFlare
2. Update DNS to CloudFlare nameservers
3. Enable "Full (strict)" SSL mode
4. Enable "Always Use HTTPS"
5. Configure page rules for caching

## Environment-Specific Configurations

### Development
```env
NODE_ENV=development
LOG_LEVEL=debug
PRETTY_LOGS=true
CACHE_TTL_SECONDS=60
```

### Staging
```env
NODE_ENV=production
LOG_LEVEL=info
PRETTY_LOGS=false
CACHE_TTL_SECONDS=300
TRUST_PROXY=true
```

### Production
```env
NODE_ENV=production
LOG_LEVEL=warn
PRETTY_LOGS=false
CACHE_TTL_SECONDS=600
TRUST_PROXY=true
RATE_LIMIT_MAX_REQUESTS=1000
```

## Troubleshooting

### Common Issues

1. **Memory Issues**
   ```bash
   # Check memory usage
   node --max-old-space-size=1024 dist/server.js
   
   # Monitor with PM2
   pm2 monit
   ```

2. **Port Issues**
   ```bash
   # Check port usage
   lsof -i :3000
   
   # Kill process
   kill -9 PID
   ```

3. **Environment Variables**
   ```bash
   # Verify environment
   printenv | grep FYND
   
   # Test configuration
   npm run type-check
   ```

4. **Build Issues**
   ```bash
   # Clean build
   rm -rf dist/
   npm run build
   
   # Check TypeScript errors
   npm run type-check
   ```

### Performance Issues

1. **High Response Times**
   - Check cache hit rates
   - Monitor GraphQL query performance
   - Optimize database queries
   - Enable HTTP/2

2. **Memory Leaks**
   - Monitor heap usage
   - Check for unclosed connections
   - Review cache size limits
   - Use memory profiling tools

3. **High CPU Usage**
   - Profile application with clinic.js
   - Optimize template rendering
   - Check for infinite loops
   - Scale horizontally

## Security Checklist

- [ ] **HTTPS enabled** with valid SSL certificate
- [ ] **Environment variables** properly secured
- [ ] **Rate limiting** configured appropriately
- [ ] **Security headers** enabled (Helmet.js)
- [ ] **Input validation** on all endpoints
- [ ] **Error messages** don't expose sensitive information
- [ ] **Dependencies** regularly updated
- [ ] **Secrets** not committed to version control
- [ ] **CORS** properly configured
- [ ] **CSP headers** configured for XSS protection

This deployment guide provides multiple options for hosting your Fynd Storefront SSR application, from simple cloud deployments to advanced VPS configurations. Choose the option that best fits your requirements, budget, and technical expertise.

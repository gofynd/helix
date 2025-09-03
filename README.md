# Fynd Storefront SSR

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-5.0+-lightgrey.svg)](https://expressjs.com/)
[![GraphQL](https://img.shields.io/badge/GraphQL-16+-e10098.svg)](https://graphql.org/)

A **production-ready, server-side rendered (SSR) storefront** built with Node.js, Express, and Apollo GraphQL Client, powered by the **Fynd Platform Storefront GraphQL API**.

## 🚀 Features

- **Server-Side Rendering (SSR)** with Express and Nunjucks
- **GraphQL Integration** with Apollo Client and Fynd Platform APIs
- **5 Core Page Types**: Home, Product Listing (PLP), Product Detail (PDP), Category, Categories Listing
- **Production-Ready Architecture** with modular design and error handling
- **Caching Layer** with LRU cache and HTTP cache-control
- **SEO Optimized** with structured data, meta tags, and sitemaps
- **TypeScript** for type safety and better developer experience
- **Observability** with structured logging and request tracing
- **Responsive Design** with modern CSS and accessibility features

## 📋 Prerequisites

- **Node.js** 18.0.0 or higher
- **npm** 9.0.0 or higher
- **Fynd Platform Account** with Bearer Authentication Token

## ⚡ Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd fynd-storefront-ssr
npm install
```

### 2. Environment Configuration

Copy the environment template and configure your Fynd Platform credentials:

```bash
cp env.example .env
```

Edit `.env` with your Fynd Platform Bearer token:

```env
# Required: Fynd Platform Configuration
FYND_AUTH_TOKEN=your_actual_bearer_token_here
FYND_API_BASE_URL=https://api.fynd.com/service/application/graphql

# Optional: Server Configuration
NODE_ENV=development
PORT=3000
HOST=localhost
```

### 3. Generate GraphQL Types (Optional)

```bash
npm run codegen
```

### 4. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your storefront!

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Browser     │    │  Express SSR    │    │ Fynd GraphQL    │
│                 │◄──►│                 │◄──►│      API        │
│  (HTML/CSS/JS)  │    │  (Controllers)  │    │   (Products)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Nunjucks       │
                       │  Templates      │
                       │  (SSR Views)    │
                       └─────────────────┘
```

### Key Components

- **Express 5** - Web server with middleware pipeline
- **Nunjucks** - Template engine for server-side rendering
- **Apollo Client** - GraphQL client with caching and error handling
- **TypeScript** - Type safety and enhanced developer experience
- **LESS** - CSS preprocessor with variables, mixins, and page-specific loading
- **LRU Cache** - In-memory caching for improved performance
- **Pino** - Structured logging with request correlation

## 📁 Project Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts             # Server entry point
├── routes/               # HTTP route definitions
│   ├── home.ts
│   ├── plp.ts
│   ├── pdp.ts
│   ├── category.ts
│   └── categories.ts
├── controllers/          # Request handlers and business logic
│   ├── home.ts
│   ├── plp.ts
│   ├── pdp.ts
│   ├── category.ts
│   └── categories.ts
├── services/             # GraphQL service layer
│   ├── catalog.ts
│   └── content.ts
├── graphql/              # GraphQL queries and fragments
│   ├── queries/
│   │   ├── catalog.ts
│   │   └── content.ts
│   └── fragments/
│       └── common.ts
├── lib/                  # Core utilities and configuration
│   ├── apollo.ts         # GraphQL client setup
│   ├── cache.ts          # Caching utilities
│   ├── config.ts         # Configuration management
│   ├── errors.ts         # Error handling utilities
│   └── logger.ts         # Logging configuration
├── middlewares/          # Express middlewares
│   ├── error.ts          # Error handling middleware
│   └── request.ts        # Request processing middlewares
├── views/                # Nunjucks templates
│   ├── layouts/
│   │   └── base.njk
│   ├── pages/
│   │   ├── home.njk
│   │   ├── plp.njk
│   │   ├── pdp.njk
│   │   ├── category.njk
│   │   └── categories.njk
│   └── partials/
│       ├── header.njk
│       ├── footer.njk
│       └── product-card.njk
└── types/                # TypeScript type definitions
    └── graphql.ts        # Generated GraphQL types
```

## 🛣️ Routes

| Route | Description | Controller |
|-------|-------------|------------|
| `/` | Home page with featured content | `homeController` |
| `/products` | Product listing with search & filters | `plpController` |
| `/product/:slug` | Individual product details | `pdpController` |
| `/category/:slug` | Category page with products | `categoryController` |
| `/categories` | All categories listing | `categoriesController` |

### API Endpoints

Each page also has a corresponding API endpoint for AJAX requests:

- `/api/home` - Home page data
- `/products/api` - Product listing data
- `/product/api/:slug` - Product details data
- `/category/api/:slug` - Category data
- `/categories/api` - Categories data

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FYND_AUTH_TOKEN` | ✅ | - | Fynd Platform Bearer Authentication Token |
| `FYND_API_BASE_URL` | ❌ | Fynd GraphQL endpoint | GraphQL API base URL |
| `NODE_ENV` | ❌ | `development` | Environment mode |
| `PORT` | ❌ | `3000` | Server port |
| `HOST` | ❌ | `localhost` | Server host |
| `CACHE_TTL_SECONDS` | ❌ | `300` | Cache TTL in seconds |
| `CACHE_MAX_SIZE` | ❌ | `1000` | Max cache entries |
| `REQUEST_TIMEOUT_MS` | ❌ | `3000` | GraphQL request timeout |
| `MAX_RETRIES` | ❌ | `2` | Max retry attempts |
| `LOG_LEVEL` | ❌ | `info` | Logging level |
| `PRETTY_LOGS` | ❌ | `false` | Pretty print logs |

## 🚦 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload (includes LESS watch)
npm run build        # Build for production (includes LESS compilation and optimization)
npm start           # Start production server

# Styles
npm run styles       # Compile LESS to CSS once
npm run styles:watch # Watch LESS files and compile on changes

# Code Quality
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint issues
npm run format       # Format code with Prettier (includes LESS files)
npm run type-check   # TypeScript type checking

# GraphQL
npm run codegen      # Generate GraphQL types

# Testing
npm test            # Run tests
npm run test:watch  # Run tests in watch mode
npm run test:coverage # Run tests with coverage
```

### GraphQL Code Generation

The project uses GraphQL Code Generator to create TypeScript types from your GraphQL queries:

```bash
npm run codegen
```

This generates `src/types/graphql.ts` with typed operations for better development experience.

### LESS Styling System

The project uses LESS for CSS preprocessing with a modular, page-specific loading approach:

#### File Structure
```
src/styles/
├── main.less              # Base styles + global components
├── home.less              # Home page specific styles
├── plp.less               # Product listing page styles
├── pdp.less               # Product detail page styles
├── category.less          # Category page styles
├── categories.less        # Categories listing styles
├── utils/
│   ├── variables.less     # Global variables (colors, spacing, etc.)
│   └── mixins.less        # Reusable mixins and utilities
├── base/
│   ├── reset.less         # CSS reset and base styles
│   └── typography.less    # Typography system
├── components/
│   ├── header.less        # Header component styles
│   └── product-card.less  # Product card component
└── pages/
    ├── home.less          # Home page specific styles
    ├── plp.less           # PLP specific styles
    ├── pdp.less           # PDP specific styles
    └── categories.less    # Categories page styles
```

#### Lazy Loading Strategy

CSS files are loaded based on the current page:
- **main.css** - Always loaded (base styles + global components)
- **home.css** - Only loaded on home page
- **plp.css** - Only loaded on product listing pages
- **pdp.css** - Only loaded on product detail pages
- **category.css** - Only loaded on category pages
- **categories.css** - Only loaded on categories listing page

#### Development Workflow

```bash
# Watch LESS files during development
npm run dev              # Includes LESS watch mode

# Compile LESS manually
npm run styles           # Compile once
npm run styles:watch     # Watch and compile on changes

# Production build with optimization
npm run build           # Includes LESS compilation and CSS optimization
```

#### Variables and Mixins

The system includes comprehensive variables and mixins:
- **Colors** - Brand colors, semantic colors, neutral palette
- **Typography** - Font sizes, weights, line heights
- **Spacing** - Consistent spacing scale
- **Breakpoints** - Responsive design breakpoints
- **Mixins** - Button styles, form controls, layout utilities

Example usage:
```less
.my-component {
  .button-base();
  .button-large();
  .button-variant(@primary-color, @white);
  
  .media-md({
    .button-medium();
  });
}
```

## 📈 Performance

### Caching Strategy

- **In-Memory LRU Cache**: Product and category data cached for 5-10 minutes
- **HTTP Cache Headers**: Proper cache-control headers for browser caching
- **GraphQL Query Caching**: Apollo Client caches queries automatically
- **Template Caching**: Nunjucks templates cached in production

### Performance Targets

- **First Contentful Paint (FCP)**: < 2.5s
- **Time to Interactive (TTI)**: < 4s for PLP & Category pages
- **SEO Score**: 90+ on Lighthouse

## 🔒 Security

- **Helmet.js** for security headers
- **Input Validation** with Zod schemas
- **Rate Limiting** to prevent abuse
- **Error Sanitization** to prevent information leakage
- **HTTPS Enforcement** in production
- **Content Security Policy** (CSP) headers

## 📊 Monitoring & Observability

### Logging

Structured logging with Pino provides:

- **Request Correlation IDs** for tracing
- **Performance Metrics** for response times
- **Error Tracking** with full context
- **Cache Hit/Miss Ratios**
- **GraphQL Operation Metrics**

### Health Checks

- `GET /health` - Application health status
- Includes memory usage, uptime, and version info

## 🚀 Deployment

### Production Build

```bash
npm run build
npm start
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
TRUST_PROXY=true
PRETTY_LOGS=false
LOG_LEVEL=warn
```

### Docker Support

```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist/ ./dist/
COPY public/ ./public/
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Platform Deployment

The application is ready for deployment on:

- **Render** - Zero-config deployment
- **Fly.io** - Global edge deployment
- **Google Cloud Run** - Serverless containers
- **AWS EC2** - Traditional server deployment
- **Heroku** - Platform-as-a-Service

## 🧪 Testing

### Unit Tests

```bash
npm test
```

Tests are co-located with source files using the `.spec.ts` pattern.

### E2E Testing

Basic smoke tests ensure all routes render successfully:

```bash
npm run test:e2e
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Standards

- **ESLint** configuration enforces Airbnb style guide
- **Prettier** for consistent code formatting
- **TypeScript** strict mode enabled
- **Commit Messages** follow conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs and feature requests via GitHub Issues
- **Fynd Platform**: Visit [Fynd Platform Documentation](https://platform.fynd.com/help/docs) for API details

## 🙏 Acknowledgments

- **Fynd Platform** for providing the GraphQL API
- **Apollo GraphQL** for excellent client libraries
- **Express.js** community for robust web framework
- **Nunjucks** for powerful templating

---

**Happy Coding! 🎉**

Made with ❤️ by the Fynd team

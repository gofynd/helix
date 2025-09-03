# LESS Styling Guide

This guide covers the LESS-based styling system implemented in the Fynd Storefront SSR project, including the lazy-loading CSS architecture and development workflow.

## Overview

The project uses LESS for CSS preprocessing with a **page-specific lazy loading approach** that only loads the CSS required for each page, improving performance and reducing bundle sizes.

## Architecture

### File Structure

```
src/styles/
├── main.less              # Base entry point (always loaded)
├── home.less              # Home page entry point
├── plp.less               # Product listing page entry point
├── pdp.less               # Product detail page entry point
├── category.less          # Category page entry point
├── categories.less        # Categories listing entry point
├── utils/
│   ├── variables.less     # Global variables and design tokens
│   └── mixins.less        # Reusable mixins and utilities
├── base/
│   ├── reset.less         # CSS reset and normalization
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

### Compilation Output

```
public/css/
├── main.css               # Base styles + global components (19KB)
├── home.css               # Home page styles (32KB)
├── plp.css                # Product listing styles (31KB)
├── pdp.css                # Product detail styles (34KB)
├── category.css           # Category page styles (31KB)
├── categories.css         # Categories listing styles (24KB)
├── critical/
│   └── critical.css       # Critical above-the-fold CSS (1.7KB)
└── manifest.json          # Cache-busting manifest
```

## Lazy Loading Strategy

### CSS Loading Logic

The system automatically determines which CSS files to load based on the current route:

| Route Pattern | CSS Files Loaded |
|---------------|------------------|
| `/` (Home) | `main.css` + `home.css` |
| `/products` | `main.css` + `plp.css` |
| `/product/:slug` | `main.css` + `pdp.css` |
| `/category/:slug` | `main.css` + `category.css` |
| `/categories` | `main.css` + `categories.css` |

### Implementation

CSS files are loaded using the `preload` strategy for optimal performance:

```html
<!-- Lazy-loaded with JavaScript fallback -->
<link rel="preload" href="/static/css/main.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/static/css/main.css"></noscript>

<link rel="preload" href="/static/css/home.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/static/css/home.css"></noscript>
```

## Development Workflow

### Available Commands

```bash
# Development with watch mode
npm run dev                # Starts server + LESS watch mode

# Manual compilation
npm run styles             # Compile LESS once
npm run styles:watch       # Watch and compile on changes

# Production build
npm run build              # Full production build with optimization
```

### Watch Mode

During development, LESS files are automatically compiled when changed:

```bash
📦 Compiling: src/styles/pages/home.less
✅ Compiled: public/css/home.css
```

### Production Optimization

The production build includes several optimizations:

1. **LESS Compilation** with production settings
2. **PostCSS Processing** with autoprefixer and cssnano
3. **Critical CSS Extraction** for above-the-fold content
4. **Cache-busting Manifest** generation

```bash
📊 CSS Optimization Results:
────────────────────────────────────────
home.css         31.5 KB → 31.4 KB (0.0% saved)
main.css         18.7 KB → 18.6 KB (0.1% saved)
Total: 169.4 KB → 169.3 KB (0.0% saved)
```

## Design System

### Variables

The system includes comprehensive design tokens:

```less
// Colors
@primary-color: #007bff;
@secondary-color: #6c757d;
@success-color: #28a745;

// Typography
@font-family-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
@font-size-base: 1rem;
@font-weight-medium: 500;

// Spacing
@spacing-4: 1rem;      // 16px
@spacing-6: 1.5rem;    // 24px
@spacing-8: 2rem;      // 32px

// Breakpoints
@screen-sm: 576px;
@screen-md: 768px;
@screen-lg: 992px;
```

### Mixins

Powerful mixins for common patterns:

```less
// Responsive breakpoints
.media-md({
  font-size: @font-size-lg;
});

// Button variants
.button-base();
.button-large();
.button-variant(@primary-color, @white);

// Layout utilities
.flex-center();
.container();
.grid-auto-fit(280px, @spacing-6);
```

### Component Example

```less
.product-card {
  background: @card-bg;
  border: 1px solid @border-light;
  .rounded(@border-radius-lg);
  .transition(all, @transition-base);
  
  &:hover {
    transform: translateY(-4px);
    .shadow(md);
  }
  
  &__image {
    .aspect-ratio(1);
    overflow: hidden;
  }
  
  &__title {
    .font-size(@font-size-base, @line-height-tight);
    font-weight: @font-weight-medium;
    .text-truncate-lines(2);
  }
  
  .media-sm-max({
    &__title {
      .font-size(@font-size-sm);
    }
  });
}
```

## Performance Benefits

### Bundle Size Optimization

- **Main CSS**: 19KB (base styles, always loaded)
- **Page-specific CSS**: 24-34KB (loaded only when needed)
- **Critical CSS**: 1.7KB (inlined above-the-fold styles)

### Loading Performance

- **Preload Strategy**: CSS loads asynchronously without blocking rendering
- **Cache Busting**: Manifest with MD5 hashes for optimal caching
- **Compression**: Production builds include cssnano optimization

### Network Efficiency

```
Traditional Approach:
└── single.css (150KB) - loaded on every page

Our Approach:
├── main.css (19KB) - loaded on every page
└── home.css (32KB) - loaded only on home page
Total: 51KB for home page (vs 150KB)
```

## Best Practices

### File Organization

1. **Keep components modular** - Each component in its own file
2. **Use semantic naming** - `.product-card` not `.pc`
3. **Follow BEM methodology** - `.component__element--modifier`
4. **Group related styles** - All button variants in one section

### Variable Usage

```less
// ✅ Good - Use design tokens
.my-component {
  padding: @spacing-4;
  color: @primary-color;
  .media-md({
    padding: @spacing-6;
  });
}

// ❌ Bad - Hard-coded values
.my-component {
  padding: 16px;
  color: #007bff;
}
```

### Mixin Usage

```less
// ✅ Good - Use existing mixins
.custom-button {
  .button-base();
  .button-variant(@success-color, @white);
}

// ❌ Bad - Duplicate styles
.custom-button {
  display: inline-flex;
  padding: 12px 24px;
  border: none;
  /* ... */
}
```

### Responsive Design

```less
// ✅ Good - Mobile-first approach
.component {
  font-size: @font-size-sm;
  
  .media-md({
    font-size: @font-size-base;
  });
  
  .media-lg({
    font-size: @font-size-lg;
  });
}
```

## Troubleshooting

### Common Issues

1. **Compilation Errors**
   ```bash
   # Check LESS syntax
   npm run styles
   ```

2. **Missing Variables**
   ```less
   // Always import variables in page-specific files
   @import '../utils/variables.less';
   @import '../utils/mixins.less';
   ```

3. **Build Failures**
   ```bash
   # Clean build
   rm -rf public/css/
   npm run build:styles
   ```

### Debug Mode

Enable detailed logging during development:

```bash
DEBUG=less npm run styles:watch
```

## Integration with Templates

The Nunjucks templates automatically load the correct CSS files:

```html
<!-- In layouts/base.njk -->
{% set cssFiles = getCSSFiles(req) %}
{% for cssFile in cssFiles %}
<link rel="preload" href="{{ cssFile }}" as="style" onload="this.onload=null;this.rel='stylesheet'">
{% endfor %}
```

This ensures that:
- Only required CSS is loaded
- CSS loads asynchronously
- No-JS users get fallback styles
- Cache busting works automatically

## Future Enhancements

Planned improvements include:

1. **PurgeCSS Integration** - Remove unused CSS automatically
2. **Critical CSS Automation** - Generate critical CSS per page type
3. **Component CSS Splitting** - Load component CSS on-demand
4. **CSS-in-JS Migration Path** - For dynamic styling needs

The LESS system provides a solid foundation that can evolve with the project's needs while maintaining excellent performance and developer experience.

/**
 * CSS Helper for Page-Specific Stylesheet Loading
 * 
 * Determines which CSS files to load based on the current page/route
 */

export interface CSSLoadConfig {
  main: boolean;
  page?: string;
  components?: string[];
}

/**
 * Get CSS files to load for a specific page
 */
export function getCSSFilesForPage(pageName: string): string[] {
  const cssFiles: string[] = [];
  
  // Always load Tailwind CSS first
  cssFiles.push('/static/css/tailwind.css');
  
  // Always load main styles (base + global components)
  cssFiles.push('/static/css/main.css');
  
  // Page-specific CSS mapping
  const pageStylesMap: Record<string, string[]> = {
    'home': ['/static/css/home.css'],
    'plp': ['/static/css/plp.css'],
    'pdp': ['/static/css/pdp.css'],
    'category': ['/static/css/category.css'],
    'categories': ['/static/css/categories.css'],
    'brands': ['/static/css/brands.css'],
  };
  
  // Add page-specific styles
  const pageStyles = pageStylesMap[pageName];
  if (pageStyles) {
    cssFiles.push(...pageStyles);
  }
  
  return cssFiles;
}

/**
 * Get page name from route path
 */
export function getPageNameFromRoute(path: string): string {
  // Remove leading slash and query parameters
  const cleanPath = path.replace(/^\//, '').split('?')[0];
  
  // Route to page name mapping
  if (cleanPath === '' || cleanPath === '/') {
    return 'home';
  }
  
  if (cleanPath.startsWith('products')) {
    return 'plp';
  }
  
  if (cleanPath.startsWith('product/')) {
    return 'pdp';
  }
  
  if (cleanPath === 'categories') {
    return 'categories';
  }
  
  if (cleanPath.startsWith('category/')) {
    return 'category';
  }
  
  if (cleanPath === 'brands') {
    return 'brands';
  }
  
  // Default to main styles only
  return 'default';
}

/**
 * Generate preload links for CSS files
 */
export function generateCSSPreloadLinks(cssFiles: string[]): string {
  return cssFiles
    .map(file => `<link rel="preload" href="${file}" as="style" onload="this.onload=null;this.rel='stylesheet'">`)
    .join('\n');
}

/**
 * Generate fallback CSS links for no-JS users
 */
export function generateCSSFallbackLinks(cssFiles: string[]): string {
  return cssFiles
    .map(file => `<link rel="stylesheet" href="${file}">`)
    .join('\n');
}

#!/usr/bin/env node

/**
 * CSS Optimization Script
 * 
 * Optimizes and minifies CSS files for production
 */

const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const postcss = require('postcss');
const cssnano = require('cssnano');
const autoprefixer = require('autoprefixer');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

const cssDir = path.join(__dirname, '..', 'public', 'css');

async function optimizeCSSFile(filepath) {
  try {
    console.log(`Optimizing ${path.basename(filepath)}...`);
    
    // Read the CSS file
    const css = await readFile(filepath, 'utf8');
    
    // Process with PostCSS
    const result = await postcss([
      autoprefixer(),
      cssnano({
        preset: ['default', {
          discardComments: {
            removeAll: true,
          },
          normalizeWhitespace: true,
        }],
      }),
    ]).process(css, {
      from: filepath,
      to: filepath,
    });
    
    // Write the optimized CSS
    await writeFile(filepath, result.css, 'utf8');
    
    console.log(`✓ Optimized ${path.basename(filepath)}`);
    
  } catch (error) {
    console.error(`Failed to optimize ${path.basename(filepath)}:`, error.message);
    throw error;
  }
}

async function findCSSFiles(dir) {
  const files = [];
  const items = await readdir(dir);
  
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const itemStat = await stat(fullPath);
    
    if (itemStat.isDirectory()) {
      const subFiles = await findCSSFiles(fullPath);
      files.push(...subFiles);
    } else if (item.endsWith('.css') && !item.endsWith('.min.css')) {
      files.push(fullPath);
    }
  }
  
  return files;
}

async function optimize() {
  try {
    console.log('Starting CSS optimization...');
    
    // Check if CSS directory exists
    if (!fs.existsSync(cssDir)) {
      console.log('No CSS directory found. Run build:styles first.');
      process.exit(1);
    }
    
    // Find all CSS files
    const cssFiles = await findCSSFiles(cssDir);
    
    if (cssFiles.length === 0) {
      console.log('No CSS files found to optimize.');
      process.exit(0);
    }
    
    console.log(`Found ${cssFiles.length} CSS files to optimize`);
    
    // Optimize each file
    for (const file of cssFiles) {
      await optimizeCSSFile(file);
    }
    
    console.log('✓ CSS optimization complete');
    
  } catch (error) {
    console.error('Optimization failed:', error);
    process.exit(1);
  }
}

// Only run in production
if (process.env.NODE_ENV !== 'production') {
  console.log('CSS optimization is only run in production mode.');
  console.log('Set NODE_ENV=production to run optimization.');
  process.exit(0);
}

optimize();

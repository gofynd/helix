#!/usr/bin/env node

/**
 * LESS Build Script
 * 
 * Compiles LESS files to CSS with watching capability for development
 */

const less = require('less');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const chokidar = require('chokidar');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch');

const srcDir = path.join(__dirname, '..', 'src', 'styles');
const outputDir = path.join(__dirname, '..', 'public', 'css');

// Main entry point for LESS compilation
const mainFile = path.join(srcDir, 'main.less');
const outputFile = path.join(outputDir, 'main.css');

// LESS options
const lessOptions = {
  paths: [srcDir], // Paths for @import directives
  compress: isProduction,
  sourceMap: !isProduction ? {} : undefined,
};

async function ensureOutputDir() {
  try {
    await mkdir(outputDir, { recursive: true });
  } catch (error) {
    if (error.code !== 'EEXIST') {
      throw error;
    }
  }
}

async function compileLess() {
  try {
    console.log(`Compiling LESS (${isProduction ? 'production' : 'development'})...`);
    
    // Ensure output directory exists
    await ensureOutputDir();
    
    // Read the main LESS file
    const input = await readFile(mainFile, 'utf8');
    
    // Compile LESS to CSS
    const output = await less.render(input, {
      ...lessOptions,
      filename: mainFile, // For error reporting and imports
    });
    
    // Write the compiled CSS
    await writeFile(outputFile, output.css, 'utf8');
    
    // Write source map if in development
    if (!isProduction && output.map) {
      await writeFile(`${outputFile}.map`, output.map, 'utf8');
    }
    
    console.log('✓ LESS compilation complete');
    
    // Also compile individual page styles
    const pageStyles = [
      'home.less',
      'plp.less',
      'pdp.less',
      'categories.less',
      'brands.less',
      'category.less'
    ];
    
    for (const file of pageStyles) {
      await compilePageStyle(file);
    }
    
  } catch (error) {
    console.error('LESS compilation failed:', error.message);
    if (!isWatch) {
      process.exit(1);
    }
  }
}

async function compilePageStyle(filename) {
  try {
    const inputPath = path.join(srcDir, filename);
    const outputPath = path.join(outputDir, filename.replace('.less', '.css'));
    
    // Check if file exists
    if (!fs.existsSync(inputPath)) {
      return;
    }
    
    const input = await readFile(inputPath, 'utf8');
    
    const output = await less.render(input, {
      ...lessOptions,
      filename: inputPath,
    });
    
    await writeFile(outputPath, output.css, 'utf8');
    
    if (!isProduction && output.map) {
      await writeFile(`${outputPath}.map`, output.map, 'utf8');
    }
    
    console.log(`✓ Compiled ${filename}`);
    
  } catch (error) {
    console.error(`Failed to compile ${filename}:`, error.message);
  }
}

async function watch() {
  console.log('Watching LESS files for changes...');
  
  // Initial build
  await compileLess();
  
  // Watch for changes
  const watcher = chokidar.watch(path.join(srcDir, '**/*.less'), {
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 300,
      pollInterval: 100,
    },
  });
  
  watcher.on('change', async (filepath) => {
    console.log(`File changed: ${path.relative(srcDir, filepath)}`);
    await compileLess();
  });
  
  watcher.on('add', async (filepath) => {
    console.log(`File added: ${path.relative(srcDir, filepath)}`);
    await compileLess();
  });
  
  watcher.on('unlink', async (filepath) => {
    console.log(`File removed: ${path.relative(srcDir, filepath)}`);
    await compileLess();
  });
  
  // Handle graceful shutdown for multiple signals
  const shutdown = (signal) => {
    console.log(`\nReceived ${signal}, stopping LESS watcher...`);
    watcher.close();
    setTimeout(() => {
      process.exit(0);
    }, 1000);
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('exit', () => {
    if (watcher) {
      watcher.close();
    }
  });
}

// Run the build
if (isWatch) {
  watch();
} else {
  compileLess();
}

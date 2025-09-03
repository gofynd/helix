#!/usr/bin/env node

/**
 * Tailwind CSS Build Script
 * 
 * Builds Tailwind CSS with watching capability for development
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execAsync = promisify(exec);

const isProduction = process.env.NODE_ENV === 'production';
const isWatch = process.argv.includes('--watch') || process.env.NODE_ENV === 'development';

const inputPath = path.join(__dirname, '..', 'src', 'styles', 'tailwind.css');
const outputPath = path.join(__dirname, '..', 'public', 'css', 'tailwind.css');
const outputDir = path.dirname(outputPath);

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const buildCommand = isProduction
  ? `npx tailwindcss -i ${inputPath} -o ${outputPath} --minify`
  : `npx tailwindcss -i ${inputPath} -o ${outputPath}`;

const watchCommand = `${buildCommand} --watch`;

async function build() {
  try {
    console.log(`Building Tailwind CSS (${isProduction ? 'production' : 'development'})...`);
    
    const command = isWatch ? watchCommand : buildCommand;
    
    if (isWatch) {
      // For watch mode, use spawn to keep process running
      const { spawn } = require('child_process');
      const child = spawn('npx', command.split(' ').slice(1), {
        stdio: 'inherit',
        shell: true
      });
      
      child.on('error', (error) => {
        console.error('Tailwind build error:', error);
        process.exit(1);
      });
      
      process.on('SIGINT', () => {
        child.kill('SIGINT');
        process.exit(0);
      });
    } else {
      // For single build, use exec
      const { stdout, stderr } = await execAsync(command);
      if (stdout) console.log(stdout);
      if (stderr) console.error(stderr);
      console.log('✓ Tailwind CSS build complete');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();

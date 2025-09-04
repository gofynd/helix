#!/usr/bin/env node

/**
 * Kill processes running on a specific port
 * Usage: node scripts/kill-port.js [port]
 * Default port: 3000
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

const port = process.argv[2] || '3000';

async function killProcessOnPort(port) {
  try {
    console.log(`Looking for processes on port ${port}...`);
    
    // Find processes using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    
    if (!stdout.trim()) {
      console.log(`No processes found on port ${port}`);
      return;
    }
    
    const pids = stdout.trim().split('\n').filter(pid => pid.trim());
    
    console.log(`Found ${pids.length} process(es) on port ${port}: ${pids.join(', ')}`);
    
    // Kill each process
    for (const pid of pids) {
      try {
        console.log(`Killing process ${pid}...`);
        await execAsync(`kill -9 ${pid}`);
        console.log(`✓ Process ${pid} killed`);
      } catch (error) {
        console.error(`✗ Failed to kill process ${pid}:`, error.message);
      }
    }
    
    console.log(`✓ All processes on port ${port} have been terminated`);
    
  } catch (error) {
    if (error.message.includes('No such process')) {
      console.log(`No processes found on port ${port}`);
    } else {
      console.error('Error:', error.message);
      process.exit(1);
    }
  }
}

killProcessOnPort(port);

/**
 * Server entry point
 * 
 * Starts the Express server with proper error handling,
 * graceful shutdown, and configuration validation
 */

import { createApp, appInfo } from './app';
import { Config } from './lib/config';
import { startupLogger, shutdownLogger } from './lib/logger';
import { cache } from './lib/cache';

/**
 * Graceful shutdown handler
 */
function setupGracefulShutdown(server: any): void {
  const shutdown = (signal: string) => {
    shutdownLogger.info({ signal }, `Received ${signal}, starting graceful shutdown`);
    
    server.close((err: any) => {
      if (err) {
        shutdownLogger.error({ err }, 'Error during server shutdown');
        process.exit(1);
      }
      
      shutdownLogger.info('Server closed successfully');
      
      // Clear cache
      cache.clear();
      shutdownLogger.info('Cache cleared');
      
      process.exit(0);
    });
    
    // Force exit after 30 seconds
    setTimeout(() => {
      shutdownLogger.error('Forced shutdown due to timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Unhandled error handlers
 */
function setupErrorHandlers(): void {
  process.on('uncaughtException', (error) => {
    startupLogger.fatal({ err: error }, 'Uncaught exception');
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    startupLogger.fatal({ 
      reason, 
      promise: promise.toString() 
    }, 'Unhandled promise rejection');
    process.exit(1);
  });
}

/**
 * Main server startup function
 */
async function startServer(): Promise<void> {
  try {
    // Validate configuration
    Config.validate();
    
    startupLogger.info({
      name: appInfo.name,
      version: appInfo.version,
      nodeVersion: process.version,
      env: Config.isDevelopment ? 'development' : 'production',
    }, 'Starting application');

    // Create Express app
    const app = createApp();

    // Start server
    const server = app.listen(Config.port, Config.host, () => {
      startupLogger.info({
        port: Config.port,
        host: Config.host,
        env: Config.isDevelopment ? 'development' : 'production',
      }, `🚀 ${appInfo.name} v${appInfo.version} running at http://${Config.host}:${Config.port}`);
      
      // Log cache stats
      const cacheStats = cache.getStats();
      startupLogger.info({
        cacheMaxSize: cacheStats.maxSize,
        cacheTtl: Config.cacheTtl,
      }, 'Cache initialized');
      
      // Setup graceful shutdown
      setupGracefulShutdown(server);
    });

    // Handle server errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        startupLogger.error({ port: Config.port }, `Port ${Config.port} is already in use`);
      } else {
        startupLogger.error({ err: error }, 'Server error');
      }
      process.exit(1);
    });

  } catch (error) {
    startupLogger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// Setup error handlers
setupErrorHandlers();

// Start server
startServer();

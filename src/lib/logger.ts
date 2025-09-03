/**
 * Structured logging with Pino
 * 
 * Provides:
 * - Structured JSON logging for production
 * - Pretty printing for development
 * - Request correlation IDs
 * - Performance timing utilities
 * - Safe error serialization
 */

import pino from 'pino';
import { Config } from './config';

/**
 * Base logger instance
 */
export const logger = pino({
  level: Config.logLevel,
  ...(Config.prettyLogs && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  formatters: {
    level(label) {
      return { level: label };
    },
    bindings() {
      return {
        service: 'fynd-storefront-ssr',
        version: process.env.npm_package_version || '1.0.0',
      };
    },
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  redact: {
    paths: [
      // Redact sensitive data
      'req.headers.authorization',
      'req.headers["x-application-key"]',
      'req.headers["x-application-token"]',
      'req.headers.cookie',
      'variables.password',
      'variables.token',
      'context.password',
      'context.token',
    ],
    censor: '[REDACTED]',
  },
});

/**
 * Request logger with correlation ID
 */
export const requestLogger = (traceId: string) => {
  return logger.child({ traceId });
};

/**
 * Performance timing utilities
 */
export class Timer {
  private startTime: number;
  private logger: pino.Logger;

  constructor(logger: pino.Logger, private operation: string) {
    this.logger = logger;
    this.startTime = Date.now();
  }

  /**
   * Ends timing and logs duration
   */
  end(context?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;
    
    this.logger.info({
      operation: this.operation,
      duration,
      ...context,
    }, `Operation completed: ${this.operation} (${duration}ms)`);

    return duration;
  }

  /**
   * Ends timing with error and logs
   */
  error(error: Error, context?: Record<string, unknown>) {
    const duration = Date.now() - this.startTime;
    
    this.logger.error({
      err: error,
      operation: this.operation,
      duration,
      ...context,
    }, `Operation failed: ${this.operation} (${duration}ms)`);

    return duration;
  }
}

/**
 * GraphQL operation logger
 */
export const GraphQLLogger = {
  /**
   * Logs GraphQL operation start
   */
  start(
    operationName: string,
    variables: Record<string, unknown>,
    traceId?: string
  ) {
    const operationLogger = traceId ? requestLogger(traceId) : logger;
    
    operationLogger.debug({
      graphql: {
        operationName,
        variablesHash: this.hashVariables(variables),
      },
    }, `GraphQL operation starting: ${operationName}`);

    return new Timer(operationLogger, `graphql.${operationName}`);
  },

  /**
   * Logs successful GraphQL operation
   */
  success(
    operationName: string,
    duration: number,
    cacheHit: boolean = false,
    traceId?: string
  ) {
    const operationLogger = traceId ? requestLogger(traceId) : logger;
    
    operationLogger.info({
      graphql: {
        operationName,
        duration,
        cacheHit,
      },
    }, `GraphQL operation completed: ${operationName} (${duration}ms)`);
  },

  /**
   * Logs GraphQL operation error
   */
  error(
    operationName: string,
    error: Error,
    duration: number,
    traceId?: string
  ) {
    const operationLogger = traceId ? requestLogger(traceId) : logger;
    
    operationLogger.error({
      err: error,
      graphql: {
        operationName,
        duration,
      },
    }, `GraphQL operation failed: ${operationName} (${duration}ms)`);
  },

  /**
   * Creates a simple hash of variables for logging (no sensitive data)
   */
  hashVariables(variables: Record<string, unknown>): string {
    const keys = Object.keys(variables).sort();
    return keys.length > 0 ? `keys:[${keys.join(',')}]` : 'empty';
  },
};

/**
 * Cache operation logger
 */
export const CacheLogger = {
  hit(key: string, operation: string, traceId?: string) {
    const cacheLogger = traceId ? requestLogger(traceId) : logger;
    
    cacheLogger.debug({
      cache: { key, operation, hit: true },
    }, `Cache hit: ${operation}`);
  },

  miss(key: string, operation: string, traceId?: string) {
    const cacheLogger = traceId ? requestLogger(traceId) : logger;
    
    cacheLogger.debug({
      cache: { key, operation, hit: false },
    }, `Cache miss: ${operation}`);
  },

  set(key: string, ttl: number, traceId?: string) {
    const cacheLogger = traceId ? requestLogger(traceId) : logger;
    
    cacheLogger.debug({
      cache: { key, ttl, operation: 'set' },
    }, `Cache set: ${key} (TTL: ${ttl}s)`);
  },

  error(key: string, operation: string, error: Error, traceId?: string) {
    const cacheLogger = traceId ? requestLogger(traceId) : logger;
    
    cacheLogger.warn({
      err: error,
      cache: { key, operation },
    }, `Cache error: ${operation}`);
  },
};

/**
 * Application startup logger
 */
export const startupLogger = logger.child({ component: 'startup' });

/**
 * Shutdown logger
 */
export const shutdownLogger = logger.child({ component: 'shutdown' });

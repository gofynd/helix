/**
 * Application configuration management
 * 
 * Centralized configuration with validation and type safety
 * Loads from environment variables with sensible defaults
 */

// Load environment variables FIRST
import { config as dotenvConfig } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const envLocalPath = join(process.cwd(), 'env.local');
const envPath = join(process.cwd(), '.env');

if (existsSync(envLocalPath)) {
  dotenvConfig({ path: envLocalPath });
} else if (existsSync(envPath)) {
  dotenvConfig({ path: envPath });
} else {
  dotenvConfig(); // Load from default .env if it exists
}

import { z } from 'zod';

// Configuration schema with validation
const configSchema = z.object({
  // Fynd Platform
  fynd: z.object({
    authToken: z.string().min(1, 'FYND_AUTH_TOKEN is required'),
    apiBaseUrl: z.string().url().default('https://api.fynd.com/service/application/graphql'),
    applicationId: z.string().default('67a9fef03076c6a7a761763f'),
  }),

  // Server
  server: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().int().min(1).max(65535).default(3000),
    host: z.string().default('localhost'),
    trustProxy: z.coerce.boolean().default(false),
  }),

  // Cache
  cache: z.object({
    ttlSeconds: z.coerce.number().int().min(0).default(300), // 5 minutes
    maxSize: z.coerce.number().int().min(1).default(1000),
  }),

  // Request handling
  request: z.object({
    timeoutMs: z.coerce.number().int().min(100).default(3000),
    maxRetries: z.coerce.number().int().min(0).max(5).default(2),
  }),

  // Logging
  logging: z.object({
    level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    prettyLogs: z.coerce.boolean().default(false),
  }),

  // Rate limiting
  rateLimit: z.object({
    windowMs: z.coerce.number().int().min(1000).default(15 * 60 * 1000), // 15 minutes
    maxRequests: z.coerce.number().int().min(1).default(100),
  }),
});

type Config = z.infer<typeof configSchema>;

/**
 * Loads and validates configuration from environment variables
 */
function loadConfig(): Config {
  // Load environment variables
  const env = {
    fynd: {
      authToken: process.env.FYND_AUTH_TOKEN,
      apiBaseUrl: process.env.FYND_API_BASE_URL,
      applicationId: process.env.FYND_APPLICATION_ID,
    },
    server: {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      host: process.env.HOST,
      trustProxy: process.env.TRUST_PROXY,
    },
    cache: {
      ttlSeconds: process.env.CACHE_TTL_SECONDS,
      maxSize: process.env.CACHE_MAX_SIZE,
    },
    request: {
      timeoutMs: process.env.REQUEST_TIMEOUT_MS,
      maxRetries: process.env.MAX_RETRIES,
    },
    logging: {
      level: process.env.LOG_LEVEL,
      prettyLogs: process.env.PRETTY_LOGS,
    },
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS,
    },
  };

  // Validate configuration
  const result = configSchema.safeParse(env);

  if (!result.success) {
    const errors = result.error.issues.map(issue => 
      `${issue.path.join('.')}: ${issue.message}`
    ).join('\n');
    
    throw new Error(`Configuration validation failed:\n${errors}`);
  }

  return result.data;
}

// Export singleton configuration
export const config = loadConfig();

/**
 * Type-safe configuration access helpers
 */
export const Config = {
  // Full config object for advanced usage
  get fynd() { return config.fynd; },
  
  // Fynd Platform
  get fyndApiUrl() { return config.fynd.apiBaseUrl; },
  get fyndAuthToken() { return config.fynd.authToken; },
  get applicationId() { return config.fynd.applicationId; },

  // Server
  get isDevelopment() { return config.server.nodeEnv === 'development'; },
  get isProduction() { return config.server.nodeEnv === 'production'; },
  get isTest() { return config.server.nodeEnv === 'test'; },
  get port() { return config.server.port; },
  get host() { return config.server.host; },
  get trustProxy() { return config.server.trustProxy; },

  // Cache
  get cacheTtl() { return config.cache.ttlSeconds; },
  get cacheMaxSize() { return config.cache.maxSize; },

  // Request
  get requestTimeout() { return config.request.timeoutMs; },
  get maxRetries() { return config.request.maxRetries; },

  // Logging
  get logLevel() { return config.logging.level; },
  get prettyLogs() { return config.logging.prettyLogs; },

  // Rate limiting
  get rateLimitWindow() { return config.rateLimit.windowMs; },
  get rateLimitMax() { return config.rateLimit.maxRequests; },

  /**
   * Gets Fynd GraphQL headers for authentication
   */
  getFyndHeaders() {
    // If the token already includes "Bearer ", use it as is
    const token = this.fyndAuthToken;
    const authHeader = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
    
    return {
      'authorization': authHeader,
      'content-type': 'application/json',
    };
  },

  /**
   * Validates required configuration at startup
   */
  validate() {
    const required = [
      'FYND_AUTH_TOKEN',
    ];

    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}\n` +
        'Please set FYND_AUTH_TOKEN environment variable with your Bearer token.'
      );
    }
  },
};

/**
 * Centralized error taxonomy and utilities for the storefront application
 * 
 * This module provides:
 * - Custom error classes with proper inheritance
 * - Error codes and HTTP status mapping
 * - Safe error serialization for API responses
 * - GraphQL error mapping utilities
 */

// import { GraphQLError } from 'graphql';
import { ApolloError } from '@apollo/client';

/**
 * Base application error with structured properties
 */
export abstract class AppError extends Error {
  abstract readonly code: string;
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;
  
  public readonly timestamp: string;
  public readonly traceId?: string;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.timestamp = new Date().toISOString();
    this.context = context;
    this.traceId = traceId;
    
    // Maintains proper stack trace for V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Serializes error to safe JSON response (no sensitive data)
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      traceId: this.traceId,
      ...(process.env.NODE_ENV === 'development' && {
        stack: this.stack,
        context: this.context,
      }),
    };
  }
}

/**
 * Validation errors (400 Bad Request)
 */
export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR';
  readonly statusCode = 400;
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(message, { ...context, field }, traceId);
  }
}

/**
 * Resource not found errors (404 Not Found)
 */
export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND';
  readonly statusCode = 404;
  readonly isOperational = true;

  constructor(
    resource: string,
    identifier?: string,
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    const message = identifier 
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    
    super(message, { ...context, resource, identifier }, traceId);
  }
}

/**
 * Upstream service errors (502/503/504)
 */
export class UpstreamError extends AppError {
  readonly code = 'UPSTREAM_ERROR';
  readonly isOperational = true;

  constructor(
    message: string,
    public readonly statusCode: number = 502,
    public readonly service?: string,
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(message, { ...context, service }, traceId);
  }
}

/**
 * Request timeout errors (408/504)
 */
export class TimeoutError extends AppError {
  readonly code = 'TIMEOUT_ERROR';
  readonly statusCode = 408;
  readonly isOperational = true;

  constructor(
    operation: string,
    timeoutMs: number,
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(
      `Operation '${operation}' timed out after ${timeoutMs}ms`,
      { ...context, operation, timeoutMs },
      traceId
    );
  }
}

/**
 * Rate limit exceeded errors (429)
 */
export class RateLimitError extends AppError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly statusCode = 429;
  readonly isOperational = true;

  constructor(
    retryAfter?: number,
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(
      'Rate limit exceeded. Please try again later.',
      { ...context, retryAfter },
      traceId
    );
  }
}

/**
 * Authentication errors (401)
 */
export class AuthenticationError extends AppError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly statusCode = 401;
  readonly isOperational = true;

  constructor(
    message: string = 'Authentication required',
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(message, context, traceId);
  }
}

/**
 * Authorization errors (403)
 */
export class AuthorizationError extends AppError {
  readonly code = 'AUTHORIZATION_ERROR';
  readonly statusCode = 403;
  readonly isOperational = true;

  constructor(
    message: string = 'Access denied',
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(message, context, traceId);
  }
}

/**
 * Internal server errors (500)
 */
export class InternalError extends AppError {
  readonly code = 'INTERNAL_ERROR';
  readonly statusCode = 500;
  readonly isOperational = false;

  constructor(
    message: string = 'Internal server error',
    context?: Record<string, unknown>,
    traceId?: string
  ) {
    super(message, context, traceId);
  }
}

/**
 * Maps Apollo GraphQL errors to application errors
 */
export class GraphQLErrorMapper {
  /**
   * Maps ApolloError to appropriate AppError instance
   */
  static mapApolloError(
    error: ApolloError,
    operationName?: string,
    traceId?: string
  ): AppError {
    const context = {
      operationName,
      variablesHash: error.extraInfo ? '[REDACTED]' : undefined,
    };

    // Network errors (connection, timeout, etc.)
    if (error.networkError) {
      const networkError = error.networkError;
      
      if ('statusCode' in networkError) {
        const statusCode = (networkError as any).statusCode;
        
        if (statusCode === 401) {
          return new AuthenticationError(
            'GraphQL authentication failed',
            context,
            traceId
          );
        }
        
        if (statusCode === 403) {
          return new AuthorizationError(
            'GraphQL authorization failed',
            context,
            traceId
          );
        }
        
        if (statusCode === 404) {
          return new NotFoundError(
            'GraphQL endpoint',
            operationName,
            context,
            traceId
          );
        }
        
        if (statusCode === 429) {
          return new RateLimitError(undefined, context, traceId);
        }
        
        if (statusCode >= 500) {
          return new UpstreamError(
            `GraphQL server error: ${networkError.message}`,
            statusCode,
            'fynd-graphql',
            context,
            traceId
          );
        }
      }
      
      // Handle timeout specifically
      if (networkError.message.includes('timeout')) {
        return new TimeoutError(
          operationName || 'GraphQL operation',
          3000, // Default timeout from config
          context,
          traceId
        );
      }
      
      return new UpstreamError(
        `Network error: ${networkError.message}`,
        502,
        'fynd-graphql',
        context,
        traceId
      );
    }

    // GraphQL errors (validation, execution, etc.)
    if (error.graphQLErrors?.length > 0) {
      const graphQLError = error.graphQLErrors[0];
      
      return this.mapGraphQLError(graphQLError, context, traceId);
    }

    // Fallback to internal error
    return new InternalError(
      `Unknown GraphQL error: ${error.message}`,
      context,
      traceId
    );
  }

  /**
   * Maps individual GraphQL error to AppError
   */
  private static mapGraphQLError(
    error: any, // GraphQLFormattedError or GraphQLError
    context: Record<string, unknown>,
    traceId?: string
  ): AppError {
    const extensions = error.extensions || {};
    const code = extensions.code as string;

    switch (code) {
      case 'UNAUTHENTICATED':
        return new AuthenticationError(error.message, context, traceId);
      
      case 'FORBIDDEN':
        return new AuthorizationError(error.message, context, traceId);
      
      case 'BAD_USER_INPUT':
      case 'GRAPHQL_VALIDATION_FAILED':
        return new ValidationError(error.message, undefined, context, traceId);
      
      case 'NOT_FOUND':
        return new NotFoundError('Resource', undefined, context, traceId);
      
      case 'INTERNAL_ERROR':
      default:
        return new UpstreamError(
          error.message,
          500,
          'fynd-graphql',
          context,
          traceId
        );
    }
  }
}

/**
 * Error utility functions
 */
export const ErrorUtils = {
  /**
   * Checks if error is operational (expected) vs programming error
   */
  isOperational(error: Error): boolean {
    if (error instanceof AppError) {
      return error.isOperational;
    }
    return false;
  },

  /**
   * Safely extracts error message without exposing sensitive data
   */
  getSafeMessage(error: Error): string {
    if (error instanceof AppError) {
      return error.message;
    }
    
    // For unknown errors, provide generic message in production
    if (process.env.NODE_ENV === 'production') {
      return 'An unexpected error occurred';
    }
    
    return error.message;
  },

  /**
   * Creates error context from request information
   */
  createRequestContext(req: any): Record<string, unknown> {
    return {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      // Never log sensitive headers or body
    };
  },
};

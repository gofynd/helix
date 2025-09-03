/**
 * Apollo GraphQL Client setup for Fynd Storefront API
 * 
 * Features:
 * - Request-scoped client instances with authentication
 * - Error handling and retry logic
 * - Request/response logging
 * - Timeout handling
 * - Circuit breaker pattern
 */

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  from,
  ApolloLink,
  Observable,
} from '@apollo/client/core';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import fetch from 'cross-fetch';
import { Config } from './config';
import { GraphQLErrorMapper } from './errors';
import { GraphQLLogger } from './logger';

/**
 * Request context for scoped clients
 */
export interface RequestContext {
  traceId?: string;
  locale?: string;
  currency?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Circuit breaker state
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private readonly failureThreshold = 5;
  // private readonly timeoutMs = 30000; // 30 seconds
  private readonly resetTimeoutMs = 60000; // 1 minute

  canExecute(): boolean {
    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailure > this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow one request
    return true;
  }

  onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure(): void {
    this.failures++;
    this.lastFailure = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }

  getState(): string {
    return this.state;
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

/**
 * Creates timeout link that cancels requests after specified time
 */
const createTimeoutLink = (timeoutMs: number) => {
  return new ApolloLink((operation, forward) => {
    return new Observable((observer) => {
      const timeout = setTimeout(() => {
        observer.error(new Error(`GraphQL operation '${operation.operationName}' timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      const subscription = forward(operation).subscribe({
        next: (result) => {
          clearTimeout(timeout);
          observer.next(result);
        },
        error: (error) => {
          clearTimeout(timeout);
          observer.error(error);
        },
        complete: () => {
          clearTimeout(timeout);
          observer.complete();
        },
      });

      return () => {
        clearTimeout(timeout);
        subscription.unsubscribe();
      };
    });
  });
};

/**
 * Creates circuit breaker link
 */
const createCircuitBreakerLink = () => {
  return new ApolloLink((operation, forward) => {
    if (!circuitBreaker.canExecute()) {
      return new Observable((observer) => {
        observer.error(new Error(`Circuit breaker is ${circuitBreaker.getState()} for GraphQL operations`));
      });
    }

    return forward(operation).map((result) => {
      if (result.errors && result.errors.length > 0) {
        circuitBreaker.onFailure();
      } else {
        circuitBreaker.onSuccess();
      }
      return result;
    });
  });
};

/**
 * Creates logging link for GraphQL operations
 */
const createLoggingLink = () => {
  return new ApolloLink((operation, forward) => {
    const context = operation.getContext();
    const traceId = context.traceId;
    const timer = GraphQLLogger.start(
      operation.operationName || 'UnknownOperation',
      operation.variables || {},
      traceId
    );

    return forward(operation).map((result) => {
      const duration = timer.end({
        cacheHit: false, // Will be updated by cache link if applicable
        hasErrors: result.errors && result.errors.length > 0,
      });

      if (result.errors && result.errors.length > 0) {
        GraphQLLogger.error(
          operation.operationName || 'UnknownOperation',
          new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`),
          duration,
          traceId
        );
      } else {
        GraphQLLogger.success(
          operation.operationName || 'UnknownOperation',
          duration,
          false,
          traceId
        );
      }

      return result;
    });
  });
};

/**
 * Creates authentication context link
 */
const createAuthLink = (context?: RequestContext) => {
  return setContext((_operation, { headers = {} }) => {
    const authHeaders = Config.getFyndHeaders();
    
    return {
      headers: {
        ...headers,
        ...authHeaders,
        ...(context?.locale && { 'Accept-Language': context.locale }),
        ...(context?.userAgent && { 'User-Agent': context.userAgent }),
        ...(context?.traceId && { 'X-Trace-ID': context.traceId }),
      },
      traceId: context?.traceId,
    };
  });
};

/**
 * Creates error handling link
 */
const createErrorLink = () => {
  return onError(({ graphQLErrors, networkError, operation }) => {
    const context = operation.getContext();
    const traceId = context.traceId;
    const operationName = operation.operationName;

    if (graphQLErrors) {
      graphQLErrors.forEach((error) => {
        GraphQLLogger.error(
          operationName || 'UnknownOperation',
          new Error(`GraphQL error: ${error.message}`),
          0, // Duration not available in error link
          traceId
        );
      });
    }

    if (networkError) {
      GraphQLLogger.error(
        operationName || 'UnknownOperation',
        networkError,
        0,
        traceId
      );

      circuitBreaker.onFailure();
    }
  });
};

/**
 * Creates retry link with exponential backoff
 */
const createRetryLink = () => {
  return new RetryLink({
    delay: {
      initial: 300,
      max: 2000,
      jitter: true,
    },
    attempts: {
      max: Config.maxRetries,
      retryIf: (error, _operation) => {
        // Only retry on network errors or 5xx server errors
        if (error.networkError) {
          const networkError = error.networkError as any;
          
          // Don't retry on client errors (4xx)
          if (networkError.statusCode && networkError.statusCode < 500) {
            return false;
          }
          
          return true;
        }
        
        // Don't retry on GraphQL errors (business logic errors)
        return false;
      },
    },
  });
};

/**
 * Creates HTTP link with fetch configuration
 */
const createHttpLinkWithFetch = () => {
  return createHttpLink({
    uri: Config.fyndApiUrl,
    fetch,
    fetchOptions: {
      timeout: Config.requestTimeout,
    },
  });
};

/**
 * Creates Apollo Client instance with all links
 */
export function createApolloClient(context?: RequestContext): ApolloClient<any> {
  // Create link chain (order matters!)
  const link = from([
    createLoggingLink(),
    createErrorLink(),
    createCircuitBreakerLink(),
    createTimeoutLink(Config.requestTimeout),
    createRetryLink(),
    createAuthLink(context),
    createHttpLinkWithFetch(),
  ]);

  return new ApolloClient({
    link,
    cache: new InMemoryCache({
      // Type policies for better caching
      typePolicies: {
        Product: {
          keyFields: ['uid'],
        },
        Category: {
          keyFields: ['uid'],
        },
        Collection: {
          keyFields: ['uid'],
        },
      },
    }),
    defaultOptions: {
      query: {
        errorPolicy: 'all', // Return partial data with errors
        fetchPolicy: 'cache-first',
      },
    },
    // Don't use cache in SSR to avoid memory leaks
    ssrMode: true,
  });
}

/**
 * GraphQL client factory with request context
 */
export class GraphQLClientFactory {
  /**
   * Creates a request-scoped Apollo client
   */
  static createForRequest(context: RequestContext): ApolloClient<any> {
    return createApolloClient(context);
  }

  /**
   * Creates a default client (for background tasks, etc.)
   */
  static createDefault(): ApolloClient<any> {
    return createApolloClient();
  }

  /**
   * Executes a GraphQL operation with error handling
   */
  static async executeQuery<TData = any, TVariables extends Record<string, any> = any>(
    client: ApolloClient<any>,
    query: any,
    variables?: TVariables,
    context?: RequestContext
  ): Promise<TData> {
    try {
      const result = await client.query<TData, TVariables>({
        query,
        variables,
        context: {
          traceId: context?.traceId,
        },
      });

      if (result.errors && result.errors.length > 0) {
        // Map GraphQL errors to application errors
        const apolloError = {
          graphQLErrors: result.errors,
          networkError: null,
          message: result.errors[0].message,
          extraInfo: {},
        } as any;

        throw GraphQLErrorMapper.mapApolloError(
          apolloError,
          query.definitions[0]?.name?.value,
          context?.traceId
        );
      }

      return result.data;
    } catch (error: any) {
      // Map Apollo errors to application errors
      if (error.name === 'ApolloError') {
        throw GraphQLErrorMapper.mapApolloError(
          error,
          query.definitions[0]?.name?.value,
          context?.traceId
        );
      }

      throw error;
    }
  }
}

/**
 * Circuit breaker status for monitoring
 */
export const getCircuitBreakerStatus = () => ({
  state: circuitBreaker.getState(),
  canExecute: circuitBreaker.canExecute(),
});

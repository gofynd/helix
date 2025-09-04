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
import { map } from 'rxjs/operators';
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
  cookies?: Map<string, string>;
  cookieString?: string;
  responseCookies?: string[];
}

/**
 * Circuit breaker state
 */
class CircuitBreaker {
  private failures = 0;
  private lastFailure = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  private readonly failureThreshold = 10; // Increased from 5 to be less aggressive
  // private readonly timeoutMs = 30000; // 30 seconds
  private readonly resetTimeoutMs = 30000; // 30 seconds (reduced from 60)

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

  reset(): void {
    this.failures = 0;
    this.lastFailure = 0;
    this.state = 'CLOSED';
  }
}

// Global circuit breaker instance
const circuitBreaker = new CircuitBreaker();

// Reset circuit breaker on startup (for development)
if (process.env.NODE_ENV !== 'production') {
  circuitBreaker.reset();
}

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

    return forward(operation).pipe(
      map((result) => {
        if (result.errors && result.errors.length > 0) {
          circuitBreaker.onFailure();
        } else {
          circuitBreaker.onSuccess();
        }
        return result;
      })
    );
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

    return forward(operation).pipe(
      map((result) => {
        const duration = timer.end({
          cacheHit: false, // Will be updated by cache link if applicable
          hasErrors: result.errors && result.errors.length > 0,
        });

        if (result.errors && result.errors.length > 0) {
          GraphQLLogger.error(
            operation.operationName || 'UnknownOperation',
            new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`),
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
      })
    );
  });
};

/**
 * Creates authentication context link with cookie forwarding
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
        // Forward cookies to GraphQL server
        ...(context?.cookieString && { 'Cookie': context.cookieString }),
      },
      traceId: context?.traceId,
      credentials: 'include', // Ensure cookies are sent and received
    };
  });
};

/**
 * Creates error handling link
 */
const createErrorLink = () => {
  return onError(({ graphQLErrors, networkError, operation }: any) => {
    const context = operation.getContext();
    const traceId = context.traceId;
    const operationName = operation.operationName;

    if (graphQLErrors) {
      graphQLErrors.forEach((error: any) => {
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
        if ((error as any).networkError) {
          const networkError = (error as any).networkError as any;
          
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
 * Creates HTTP link with fetch configuration and cookie handling
 */
const createHttpLinkWithFetch = (context?: RequestContext) => {
  return createHttpLink({
    uri: Config.fyndApiUrl,
    fetch: (uri: any, options: any) => {
      // Add cookies to the request headers if available
      const headers = options.headers || {};
      if (context?.cookieString) {
        headers['Cookie'] = context.cookieString;
      }
      
      return fetch(uri, {
        ...options,
        headers,
        credentials: 'include', // Include cookies in requests
      }).then(response => {
        // Try to capture Set-Cookie headers from response (may not work in Node.js)
        try {
          const setCookieHeaders = response.headers.get('set-cookie');
          if (setCookieHeaders && context) {
            // Store response cookies in context for later use
            if (!context.responseCookies) {
              context.responseCookies = [];
            }
            context.responseCookies.push(setCookieHeaders);
          }
        } catch (error) {
          // Silently ignore cookie capture errors
        }
        return response;
      });
    },
    fetchOptions: {
      // timeout: Config.requestTimeout, // Remove timeout from fetchOptions as it's not standard
      credentials: 'include',
    },
  });
};

/**
 * Creates Apollo Client instance with all links and cookie handling
 */
export function createApolloClient(context?: RequestContext): ApolloClient {
  // Create link chain (order matters!)
  const link = from([
    createLoggingLink(),
    createErrorLink(),
    createCircuitBreakerLink(),
    createTimeoutLink(Config.requestTimeout),
    createRetryLink(),
    createAuthLink(context),
    createHttpLinkWithFetch(context),
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
  static createForRequest(context: RequestContext): ApolloClient {
    return createApolloClient(context);
  }

  /**
   * Creates a default client (for background tasks, etc.)
   */
  static createDefault(): ApolloClient {
    return createApolloClient();
  }

  /**
   * Executes a GraphQL query with error handling and cookie management
   */
  static async executeQuery<TData = any, TVariables extends Record<string, any> = any>(
    client: ApolloClient,
    query: any,
    variables?: TVariables,
    context?: RequestContext
  ): Promise<TData> {
    try {
      const result = await client.query({
        query,
        variables,
        context: {
          traceId: context?.traceId,
          headers: context?.cookieString ? { Cookie: context.cookieString } : {},
        },
        fetchPolicy: 'cache-first', // Use default cache policy
      });

      // In Apollo Client v4, errors are in the error property, not errors array
      if (result.error) {
        // Map GraphQL errors to application errors
        const error = result.error as any;
        const apolloError = {
          graphQLErrors: error.graphQLErrors || [],
          networkError: error.networkError || null,
          message: error.message,
          extraInfo: {},
        } as any;

        throw GraphQLErrorMapper.mapApolloError(
          apolloError,
          query.definitions[0]?.name?.value,
          context?.traceId
        );
      }

      // Ensure we have data
      if (!result.data) {
        throw new Error('No data returned from GraphQL query');
      }

      return result.data as TData;
    } catch (error: any) {
      // Map Apollo errors to application errors
      if (error.name === 'ApolloError' || error.graphQLErrors || error.networkError) {
        throw GraphQLErrorMapper.mapApolloError(
          error,
          query.definitions[0]?.name?.value,
          context?.traceId
        );
      }

      throw error;
    }
  }

  /**
   * Executes a GraphQL mutation with error handling and cookie management
   */
  static async executeMutation<TData = any, TVariables extends Record<string, any> = any>(
    client: ApolloClient,
    mutation: any,
    variables?: TVariables,
    context?: RequestContext
  ): Promise<TData> {
    try {
      const result = await client.mutate({
        mutation,
        variables,
        context: {
          traceId: context?.traceId,
          headers: context?.cookieString ? { Cookie: context.cookieString } : {},
        },
      });

      // In Apollo Client v4, errors are in the error property, not errors array
      if (result.error) {
        // Map GraphQL errors to application errors
        const error = result.error as any;
        const apolloError = {
          graphQLErrors: error.graphQLErrors || [],
          networkError: error.networkError || null,
          message: error.message,
          extraInfo: {},
        } as any;

        throw GraphQLErrorMapper.mapApolloError(
          apolloError,
          mutation.definitions[0]?.name?.value,
          context?.traceId
        );
      }

      // Ensure we have data
      if (!result.data) {
        throw new Error('No data returned from GraphQL mutation');
      }

      return result.data as TData;
    } catch (error: any) {
      // Map Apollo errors to application errors
      if (error.name === 'ApolloError' || error.graphQLErrors || error.networkError) {
        throw GraphQLErrorMapper.mapApolloError(
          error,
          mutation.definitions[0]?.name?.value,
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

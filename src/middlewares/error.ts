/**
 * Centralized error handling middleware for Express
 * 
 * This middleware:
 * - Catches all unhandled errors in the request pipeline
 * - Maps errors to appropriate HTTP responses
 * - Logs errors with proper context
 * - Returns user-safe error responses
 * - Handles different error types appropriately
 */

import { Request, Response, NextFunction } from 'express';
import { AppError, ErrorUtils } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface ErrorResponse {
  error: {
    code: string;
    message: string;
    statusCode: number;
    timestamp: string;
    traceId?: string;
  };
}

/**
 * Main error handling middleware
 * Must be registered after all routes and other middleware
 */
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(error);
  }

  const traceId = req.headers['x-trace-id'] as string || req.id;
  const requestContext = ErrorUtils.createRequestContext(req);

  let appError: AppError;

  // Convert unknown errors to AppError instances
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Log programming errors with full context
    logger.error({
      err: error,
      traceId,
      ...requestContext,
    }, 'Unhandled error converted to internal error');

    appError = new (require('@/lib/errors').InternalError)(
      ErrorUtils.getSafeMessage(error),
      requestContext,
      traceId
    );
  }

  // Log operational errors at appropriate level
  const logLevel = appError.statusCode >= 500 ? 'error' : 'warn';
  logger[logLevel]({
    err: appError,
    traceId,
    statusCode: appError.statusCode,
    ...requestContext,
  }, `${appError.code}: ${appError.message}`);

  // Build error response
  const errorResponse: ErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      statusCode: appError.statusCode,
      timestamp: appError.timestamp,
      traceId,
    },
  };

  // Set appropriate headers
  res.status(appError.statusCode);
  res.set({
    'Content-Type': 'application/json',
    'X-Trace-ID': traceId,
  });

  // Handle rate limiting headers
  if (appError.code === 'RATE_LIMIT_EXCEEDED' && appError.context?.retryAfter) {
    res.set('Retry-After', String(appError.context.retryAfter));
  }

  // Send JSON error response for API routes
  if (req.path.startsWith('/api/') || req.accepts('json')) {
    res.json(errorResponse);
    return;
  }

  // Render error page for HTML requests
  renderErrorPage(res, appError, traceId);
};

/**
 * Renders appropriate error page based on status code
 */
function renderErrorPage(res: Response, error: AppError, traceId?: string): void {
  const templateData = {
    error: {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      timestamp: error.timestamp,
      traceId,
    },
    // Add helpful context for users
    isClientError: error.statusCode >= 400 && error.statusCode < 500,
    isServerError: error.statusCode >= 500,
    showRetry: error.code === 'TIMEOUT_ERROR' || error.code === 'UPSTREAM_ERROR',
    showContact: error.statusCode >= 500,
  };

  // Try to render specific error template, fallback to generic
  const templateName = getErrorTemplateName(error.statusCode);
  
  res.render(templateName, templateData, (renderError: any) => {
    if (renderError) {
      // If template rendering fails, send plain HTML
      logger.error({ err: renderError, traceId }, 'Error template rendering failed');
      
      res.set('Content-Type', 'text/html');
      res.send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Error ${error.statusCode}</title>
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .error-container { max-width: 600px; margin: 0 auto; }
            .error-code { font-size: 4em; color: #e74c3c; margin-bottom: 20px; }
            .error-message { font-size: 1.5em; margin-bottom: 30px; }
            .trace-id { color: #7f8c8d; font-size: 0.9em; }
            .actions { margin-top: 30px; }
            .btn { 
              display: inline-block; 
              padding: 10px 20px; 
              background: #3498db; 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 0 10px;
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-code">${error.statusCode}</div>
            <div class="error-message">${error.message}</div>
            ${traceId ? `<div class="trace-id">Trace ID: ${traceId}</div>` : ''}
            <div class="actions">
              <a href="/" class="btn">Go Home</a>
              ${templateData.showRetry ? '<a href="javascript:location.reload()" class="btn">Try Again</a>' : ''}
            </div>
          </div>
        </body>
        </html>
      `);
    }
  });
}

/**
 * Determines error template name based on status code
 */
function getErrorTemplateName(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'errors/400';
    case 401:
      return 'errors/401';
    case 403:
      return 'errors/403';
    case 404:
      return 'errors/404';
    case 429:
      return 'errors/429';
    case 500:
      return 'errors/500';
    case 502:
    case 503:
    case 504:
      return 'errors/5xx';
    default:
      return statusCode >= 500 ? 'errors/5xx' : 'errors/4xx';
  }
}

/**
 * Handles 404 Not Found for unmatched routes
 */
export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  const error = new (require('@/lib/errors').NotFoundError)(
    'Route',
    req.path,
    ErrorUtils.createRequestContext(req),
    req.headers['x-trace-id'] as string || req.id
  );

  next(error);
};

/**
 * Async error wrapper for route handlers
 * Catches async errors and passes them to error middleware
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Validation error handler for Zod schema validation
 */
export const handleValidationError = (
  error: any,
  field?: string
): never => {
  const traceId = undefined; // Will be set by error middleware from request
  
  if (error.name === 'ZodError') {
    const firstIssue = error.issues[0];
    const fieldName = field || firstIssue?.path?.join('.') || 'unknown';
    const message = firstIssue?.message || 'Validation failed';
    
    throw new (require('@/lib/errors').ValidationError)(
      message,
      fieldName,
      { zodIssues: error.issues },
      traceId
    );
  }
  
  throw error;
};

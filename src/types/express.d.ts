/**
 * Express type extensions
 * 
 * Extends Express Request interface with custom properties
 */

declare global {
  namespace Express {
    interface Request {
      id: string;
      context?: {
        traceId: string;
        locale: string;
        currency: string;
        userAgent?: string;
        ip?: string;
        isBot: boolean;
        isMobile: boolean;
      };
    }
  }
}

export {};

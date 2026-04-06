/**
 * Centralized logging utility for the Weavrn application
 * Provides structured logging with different log levels
 * Prevents sensitive data from being logged in production
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogContext {
  component?: string;
  action?: string;
  userId?: string;
  [key: string]: unknown;
}

class Logger {
  private level: LogLevel;
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === "development";
    this.level = this.isDevelopment ? LogLevel.DEBUG : LogLevel.WARN;
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Debug level logging - only in development
   */
  debug(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.DEBUG && this.isDevelopment) {
      this.log("DEBUG", message, context);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.INFO) {
      this.log("INFO", message, context);
    }
  }

  /**
   * Warning level logging
   */
  warn(message: string, context?: LogContext): void {
    if (this.level <= LogLevel.WARN) {
      this.log("WARN", message, context);
    }
  }

  /**
   * Error level logging
   */
  error(message: string, error?: unknown, context?: LogContext): void {
    if (this.level <= LogLevel.ERROR) {
      const errorContext = {
        ...context,
        error: this.sanitizeError(error),
      };
      this.log("ERROR", message, errorContext);
      
      // In production, send to error tracking service
      if (!this.isDevelopment && error) {
        this.reportError(error, context);
      }
    }
  }

  /**
   * Log wallet connection events
   */
  walletConnected(address: string): void {
    this.info("Wallet connected", {
      component: "WalletConnect",
      action: "connect",
      address: this.sanitizeAddress(address),
    });
  }

  /**
   * Log wallet disconnection events
   */
  walletDisconnected(): void {
    this.info("Wallet disconnected", {
      component: "WalletConnect",
      action: "disconnect",
    });
  }

  /**
   * Log transaction events
   */
  transaction(action: string, txHash?: string, context?: LogContext): void {
    this.info(`Transaction ${action}`, {
      component: "Contract",
      action,
      txHash,
      ...context,
    });
  }

  /**
   * Log API requests
   */
  apiRequest(method: string, path: string, context?: LogContext): void {
    this.debug(`API ${method} ${path}`, {
      component: "API",
      action: "request",
      method,
      path,
      ...context,
    });
  }

  /**
   * Log API responses
   */
  apiResponse(method: string, path: string, status: number, context?: LogContext): void {
    const level = status >= 400 ? "warn" : "debug";
    this[level](`API ${method} ${path} - ${status}`, {
      component: "API",
      action: "response",
      method,
      path,
      status,
      ...context,
    });
  }

  /**
   * Log API errors
   */
  apiError(method: string, path: string, error: unknown, context?: LogContext): void {
    this.error(`API ${method} ${path} failed`, error, {
      component: "API",
      action: "error",
      method,
      path,
      ...context,
    });
  }

  /**
   * Log performance metrics
   */
  performance(metric: string, duration: number, context?: LogContext): void {
    this.debug(`Performance: ${metric} took ${duration}ms`, {
      component: "Performance",
      metric,
      duration,
      ...context,
    });
  }

  /**
   * Internal logging method
   */
  private log(level: string, message: string, context?: LogContext): void {
    const timestamp = new Date().toISOString();
    const logData = {
      timestamp,
      level,
      message,
      ...this.sanitizeContext(context),
    };

    // Format for console
    const prefix = `[${timestamp}] [${level}]`;
    const contextStr = context ? ` ${JSON.stringify(this.sanitizeContext(context))}` : "";
    
    switch (level) {
      case "DEBUG":
        console.log(`${prefix} ${message}${contextStr}`);
        break;
      case "INFO":
        console.info(`${prefix} ${message}${contextStr}`);
        break;
      case "WARN":
        console.warn(`${prefix} ${message}${contextStr}`);
        break;
      case "ERROR":
        console.error(`${prefix} ${message}${contextStr}`);
        break;
    }

    // In production, send to logging service
    if (!this.isDevelopment && level === "ERROR") {
      this.sendToLoggingService(logData);
    }
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    const sanitized = { ...context };

    // Remove sensitive fields
    const sensitiveFields = [
      "password",
      "privateKey",
      "mnemonic",
      "signature",
      "token",
      "apiKey",
      "secret",
    ];

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = "[REDACTED]";
      }
    }

    // Sanitize wallet addresses in production
    if (!this.isDevelopment && "address" in sanitized) {
      sanitized.address = this.sanitizeAddress(sanitized.address as string);
    }

    return sanitized;
  }

  /**
   * Sanitize error objects
   */
  private sanitizeError(error: unknown): unknown {
    if (!error) return null;

    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined,
      };
    }

    if (typeof error === "object") {
      return this.sanitizeContext(error as LogContext);
    }

    return String(error);
  }

  /**
   * Sanitize wallet address for logging
   */
  private sanitizeAddress(address: string): string {
    if (!address || address.length < 10) return address;
    // Show first 6 and last 4 characters
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Report error to error tracking service
   */
  private reportError(error: unknown, context?: LogContext): void {
    // TODO: Integrate with error tracking service (e.g., Sentry)
    // Example:
    // Sentry.captureException(error, {
    //   tags: context,
    // });
  }

  /**
   * Send logs to logging service
   */
  private sendToLoggingService(logData: unknown): void {
    // TODO: Integrate with logging service (e.g., Datadog, LogRocket)
    // Example:
    // fetch('/api/logs', {
    //   method: 'POST',
    //   body: JSON.stringify(logData),
    // }).catch(() => {
    //   // Silently fail - don't want logging to break the app
    // });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const debug = logger.debug.bind(logger);
export const info = logger.info.bind(logger);
export const warn = logger.warn.bind(logger);
export const error = logger.error.bind(logger);

/**
 * Performance measurement utility
 */
export class PerformanceTimer {
  private startTime: number;
  private metric: string;

  constructor(metric: string) {
    this.metric = metric;
    this.startTime = performance.now();
  }

  /**
   * End the timer and log the duration
   */
  end(context?: LogContext): number {
    const duration = Math.round(performance.now() - this.startTime);
    logger.performance(this.metric, duration, context);
    return duration;
  }
}

/**
 * Measure the performance of an async function
 */
export async function measureAsync<T>(
  metric: string,
  fn: () => Promise<T>,
  context?: LogContext
): Promise<T> {
  const timer = new PerformanceTimer(metric);
  try {
    const result = await fn();
    timer.end(context);
    return result;
  } catch (error) {
    timer.end({ ...context, error: true });
    throw error;
  }
}

/**
 * Measure the performance of a sync function
 */
export function measure<T>(
  metric: string,
  fn: () => T,
  context?: LogContext
): T {
  const timer = new PerformanceTimer(metric);
  try {
    const result = fn();
    timer.end(context);
    return result;
  } catch (error) {
    timer.end({ ...context, error: true });
    throw error;
  }
}

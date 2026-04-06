/**
 * Client-side logging utility
 * Sends security and error events to backend for monitoring
 */

export interface LogEntry {
  level: "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
  timestamp?: string;
  userAgent?: string;
  url?: string;
}

class Logger {
  private apiUrl: string;
  private queue: LogEntry[] = [];
  private isProcessing = false;

  constructor(apiUrl: string) {
    this.apiUrl = apiUrl;
  }

  /**
   * Log an event
   */
  async log(entry: LogEntry): Promise<void> {
    // Only log in browser environment
    if (typeof window === "undefined") return;

    const logEntry: LogEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date().toISOString(),
      userAgent: entry.userAgent || navigator.userAgent,
      url: entry.url || window.location.href,
    };

    this.queue.push(logEntry);

    // Process queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Log error
   */
  async error(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: "error",
      message,
      context,
    });
  }

  /**
   * Log warning
   */
  async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: "warn",
      message,
      context,
    });
  }

  /**
   * Log info
   */
  async info(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.log({
      level: "info",
      message,
      context,
    });
  }

  /**
   * Process queued logs
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;

    try {
      // Batch logs for efficiency
      const batch = this.queue.splice(0, 10);

      await fetch(`${this.apiUrl}/logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ entries: batch }),
        // Don't wait for response to avoid blocking
        keepalive: true,
      }).catch(() => {
        // Silently fail to avoid infinite loops
        // Re-queue failed entries
        this.queue.unshift(...batch);
      });
    } finally {
      this.isProcessing = false;

      // Process remaining items
      if (this.queue.length > 0) {
        // Defer to next tick
        setTimeout(() => this.processQueue(), 1000);
      }
    }
  }
}

// Initialize logger
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
export const logger = new Logger(API_URL);

/**
 * Log security event
 */
export async function logSecurityEvent(
  event: string,
  details?: Record<string, unknown>
): Promise<void> {
  await logger.warn(`Security: ${event}`, details);
}

/**
 * Log authentication event
 */
export async function logAuthEvent(
  event: string,
  wallet?: string
): Promise<void> {
  await logger.info(`Auth: ${event}`, { wallet });
}

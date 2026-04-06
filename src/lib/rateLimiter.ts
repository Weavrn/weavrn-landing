/**
 * Client-side rate limiting utility
 * Prevents abuse of API endpoints and expensive operations
 */

export class RateLimiter {
  private lastCall: number = 0;
  private minInterval: number;

  /**
   * Create a rate limiter
   * @param minIntervalMs Minimum milliseconds between calls
   */
  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  /**
   * Check if enough time has passed since last call
   */
  canExecute(): boolean {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    return timeSinceLastCall >= this.minInterval;
  }

  /**
   * Get milliseconds until next call is allowed
   */
  getTimeUntilNext(): number {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    return Math.max(0, this.minInterval - timeSinceLastCall);
  }

  /**
   * Get seconds until next call is allowed (rounded up)
   */
  getSecondsUntilNext(): number {
    return Math.ceil(this.getTimeUntilNext() / 1000);
  }

  /**
   * Execute a function if rate limit allows
   * @throws Error if rate limited
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const waitSeconds = this.getSecondsUntilNext();
      throw new Error(
        `Rate limited. Try again in ${waitSeconds}s`
      );
    }

    this.lastCall = Date.now();
    return fn();
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.lastCall = 0;
  }
}

/**
 * Multi-endpoint rate limiter
 * Tracks rate limits for multiple operations separately
 */
export class MultiRateLimiter {
  private limiters: Map<string, RateLimiter> = new Map();

  /**
   * Create a multi-endpoint rate limiter
   * @param defaultIntervalMs Default interval for all endpoints
   */
  constructor(private defaultIntervalMs: number) {}

  /**
   * Register a specific rate limit for an endpoint
   */
  register(endpoint: string, intervalMs: number): void {
    this.limiters.set(endpoint, new RateLimiter(intervalMs));
  }

  /**
   * Check if an endpoint can be called
   */
  canExecute(endpoint: string): boolean {
    const limiter = this.getLimiter(endpoint);
    return limiter.canExecute();
  }

  /**
   * Get time until next call for an endpoint
   */
  getTimeUntilNext(endpoint: string): number {
    const limiter = this.getLimiter(endpoint);
    return limiter.getTimeUntilNext();
  }

  /**
   * Execute a function for an endpoint if rate limit allows
   */
  async execute<T>(endpoint: string, fn: () => Promise<T>): Promise<T> {
    const limiter = this.getLimiter(endpoint);
    return limiter.execute(fn);
  }

  /**
   * Reset rate limit for an endpoint
   */
  reset(endpoint: string): void {
    const limiter = this.limiters.get(endpoint);
    if (limiter) {
      limiter.reset();
    }
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.limiters.forEach((limiter) => limiter.reset());
  }

  /**
   * Get or create a rate limiter for an endpoint
   */
  private getLimiter(endpoint: string): RateLimiter {
    if (!this.limiters.has(endpoint)) {
      this.limiters.set(endpoint, new RateLimiter(this.defaultIntervalMs));
    }
    return this.limiters.get(endpoint)!;
  }
}

/**
 * Decorator for rate-limited functions
 * Usage: @rateLimit(5000) // 5 second rate limit
 */
export function rateLimit(intervalMs: number) {
  const limiter = new RateLimiter(intervalMs);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      if (!limiter.canExecute()) {
        const waitSeconds = limiter.getSecondsUntilNext();
        throw new Error(
          `${propertyKey} is rate limited. Try again in ${waitSeconds}s`
        );
      }

      limiter.lastCall = Date.now();
      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Export common rate limit intervals as constants
export const RATE_LIMITS = {
  REFRESH_POSTS: 5 * 60 * 1000, // 5 minutes
  CLAIM_REWARD: 2 * 60 * 1000, // 2 minutes
  VERIFY_HANDLE: 1 * 60 * 1000, // 1 minute
  SEND_MESSAGE: 1000, // 1 second
  UPLOAD_FILE: 5 * 1000, // 5 seconds
  API_CALL: 100, // 100ms (prevent rapid-fire calls)
} as const;

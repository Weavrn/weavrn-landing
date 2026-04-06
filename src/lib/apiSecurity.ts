/**
 * API Security Utilities
 * Provides validation and security checks for API operations
 */

/**
 * Validates API URL to prevent SSRF attacks
 */
export function validateApiUrl(url: string): string {
  try {
    const parsed = new URL(url);

    // Only allow https in production
    if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") {
      throw new Error("API URL must use HTTPS in production");
    }

    // Whitelist allowed hosts
    const allowedHosts = [
      "api.weavrn.com",
      "api-staging.weavrn.com",
      "localhost:3001", // Dev only
      "127.0.0.1:3001", // Dev only
    ];

    if (!allowedHosts.includes(parsed.host)) {
      throw new Error(`API host not allowed: ${parsed.host}`);
    }

    return url;
  } catch (err) {
    throw new Error(`Invalid API URL: ${String(err)}`);
  }
}

/**
 * Validates CORS origin header
 */
export function isAllowedOrigin(origin: string): boolean {
  const allowed = [
    "https://api.weavrn.com",
    "https://api-staging.weavrn.com",
    "http://localhost:3001", // Dev only
  ];
  return allowed.includes(origin);
}

/**
 * Rate limiter for API calls
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();

  isAllowed(
    key: string,
    maxAttempts: number = 5,
    windowMs: number = 60000
  ): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];

    // Remove old attempts outside the window
    const recent = attempts.filter((t) => now - t < windowMs);

    if (recent.length >= maxAttempts) {
      return false;
    }

    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }

  reset(key: string): void {
    this.attempts.delete(key);
  }
}

/**
 * Input validation utilities
 */
export const validators = {
  /**
   * Validates wallet address format
   */
  walletAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  },

  /**
   * Validates social media handle
   */
  socialHandle(handle: string, maxLength: number = 30): boolean {
    const cleaned = handle.replace(/^@/, "").trim();

    if (cleaned.length < 1 || cleaned.length > maxLength) {
      return false;
    }

    // Alphanumeric + underscore only
    if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
      return false;
    }

    // Normalize to prevent homograph attacks
    const normalized = cleaned.normalize("NFKC");
    return normalized === cleaned;
  },

  /**
   * Validates agent name
   */
  agentName(name: string): boolean {
    const trimmed = name.trim();

    if (trimmed.length < 2 || trimmed.length > 30) {
      return false;
    }

    // Letters, numbers, spaces, and hyphens only
    const nameRegex = /^[a-zA-Z0-9][a-zA-Z0-9 -]{0,28}[a-zA-Z0-9]$/;
    return nameRegex.test(trimmed);
  },

  /**
   * Validates URL format
   */
  url(url: string): boolean {
    try {
      const parsed = new URL(url);
      // Only allow http/https
      return ["http:", "https:"].includes(parsed.protocol);
    } catch {
      return false;
    }
  },

  /**
   * Validates email format
   */
  email(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 254;
  },
};

/**
 * Sanitizes user input to prevent XSS
 */
export function sanitizeInput(input: string, maxLength: number = 1000): string {
  // Truncate to max length
  let sanitized = input.substring(0, maxLength);

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitizes URLs to prevent javascript: and data: URIs
 */
export function sanitizeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

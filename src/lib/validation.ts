/**
 * Input validation utilities for security
 * Prevents injection attacks and invalid data from reaching the API
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate X/Twitter handle format
 */
export function validateXHandle(handle: string): ValidationResult {
  const cleaned = handle.replace(/^@/, "").trim();

  if (!cleaned) {
    return { valid: false, error: "Handle cannot be empty" };
  }

  if (cleaned.length > 15) {
    return { valid: false, error: "Handle too long (max 15 characters)" };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    return {
      valid: false,
      error: "Handle can only contain letters, numbers, and underscores",
    };
  }

  return { valid: true };
}

/**
 * Validate YouTube channel handle
 */
export function validateYouTubeHandle(handle: string): ValidationResult {
  const cleaned = handle.replace(/^@/, "").trim();

  if (!cleaned) {
    return { valid: false, error: "Handle cannot be empty" };
  }

  if (cleaned.length > 30) {
    return { valid: false, error: "Handle too long (max 30 characters)" };
  }

  // YouTube handles can contain letters, numbers, underscores, hyphens, and periods
  if (!/^[a-zA-Z0-9_.-]+$/.test(cleaned)) {
    return {
      valid: false,
      error: "Handle contains invalid characters",
    };
  }

  return { valid: true };
}

/**
 * Validate URL format and ensure it's HTTPS
 */
export function validateUrl(url: string, allowHttp = false): ValidationResult {
  if (!url) {
    return { valid: false, error: "URL cannot be empty" };
  }

  try {
    const parsed = new URL(url);

    if (!allowHttp && parsed.protocol !== "https:") {
      return { valid: false, error: "URL must use HTTPS" };
    }

    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { valid: false, error: "Invalid URL protocol" };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid URL format" };
  }
}

/**
 * Validate Ethereum address format
 */
export function validateEthereumAddress(address: string): ValidationResult {
  if (!address) {
    return { valid: false, error: "Address cannot be empty" };
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return { valid: false, error: "Invalid Ethereum address format" };
  }

  return { valid: true };
}

/**
 * Validate text field length
 */
export function validateTextLength(
  text: string,
  minLength = 0,
  maxLength = 1000,
): ValidationResult {
  if (text.length < minLength) {
    return {
      valid: false,
      error: `Text must be at least ${minLength} characters`,
    };
  }

  if (text.length > maxLength) {
    return {
      valid: false,
      error: `Text must not exceed ${maxLength} characters`,
    };
  }

  return { valid: true };
}

/**
 * Validate comma-separated tags
 */
export function validateTags(
  tagsString: string,
  maxTags = 10,
  maxTagLength = 50,
): ValidationResult {
  if (!tagsString.trim()) {
    return { valid: true }; // Tags are optional
  }

  const tags = tagsString
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  if (tags.length > maxTags) {
    return { valid: false, error: `Maximum ${maxTags} tags allowed` };
  }

  for (const tag of tags) {
    if (tag.length > maxTagLength) {
      return {
        valid: false,
        error: `Tag "${tag}" exceeds ${maxTagLength} character limit`,
      };
    }

    // Tags should be alphanumeric + hyphens
    if (!/^[a-zA-Z0-9-]+$/.test(tag)) {
      return {
        valid: false,
        error: `Tag "${tag}" contains invalid characters`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate file name for safe storage
 */
export function validateFileName(fileName: string): ValidationResult {
  if (!fileName) {
    return { valid: false, error: "File name cannot be empty" };
  }

  if (fileName.length > 255) {
    return { valid: false, error: "File name too long" };
  }

  // Only allow alphanumeric, dots, hyphens, underscores
  if (!/^[a-zA-Z0-9._-]+$/.test(fileName)) {
    return {
      valid: false,
      error: "File name contains invalid characters",
    };
  }

  // Prevent directory traversal
  if (fileName.includes("..") || fileName.includes("/") || fileName.includes("\\")) {
    return { valid: false, error: "Invalid file name" };
  }

  return { valid: true };
}

/**
 * Validate numeric amount (for prices, etc.)
 */
export function validateAmount(
  amount: string,
  minAmount = 0,
  maxAmount = 1000000,
): ValidationResult {
  if (!amount) {
    return { valid: false, error: "Amount cannot be empty" };
  }

  try {
    const num = parseFloat(amount);

    if (isNaN(num)) {
      return { valid: false, error: "Invalid amount format" };
    }

    if (num < minAmount) {
      return {
        valid: false,
        error: `Amount must be at least ${minAmount}`,
      };
    }

    if (num > maxAmount) {
      return {
        valid: false,
        error: `Amount must not exceed ${maxAmount}`,
      };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: "Invalid amount" };
  }
}

/**
 * Sanitize user input to prevent injection
 * Removes potentially dangerous characters
 */
export function sanitizeInput(input: string, maxLength = 1000): string {
  return input
    .slice(0, maxLength)
    .replace(/[<>]/g, "") // Remove angle brackets
    .trim();
}

/**
 * Get user-friendly error message for API errors
 */
export function getUserFriendlyError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();

    // Network errors
    if (msg.includes("econnrefused") || msg.includes("network")) {
      return "Unable to connect to the service. Please check your internet connection and try again.";
    }

    // Auth errors
    if (msg.includes("401") || msg.includes("unauthorized")) {
      return "Your session has expired. Please reconnect your wallet.";
    }

    // Permission errors
    if (msg.includes("403") || msg.includes("forbidden")) {
      return "You don't have permission to perform this action.";
    }

    // Not found
    if (msg.includes("404") || msg.includes("not found")) {
      return "The requested resource was not found.";
    }

    // Rate limiting
    if (msg.includes("429") || msg.includes("rate limit")) {
      return "Too many requests. Please wait a moment and try again.";
    }

    // Server errors
    if (msg.includes("500") || msg.includes("server error")) {
      return "Server error. Please try again later.";
    }

    // Validation errors
    if (msg.includes("validation") || msg.includes("invalid")) {
      return "Please check your input and try again.";
    }
  }

  return "An unexpected error occurred. Please try again.";
}

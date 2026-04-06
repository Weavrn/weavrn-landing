/**
 * Centralized error handling for the Weavrn application
 * Provides type-safe error classes and user-friendly error messages
 */

export enum ErrorCode {
  // Wallet errors
  WALLET_NOT_FOUND = "WALLET_NOT_FOUND",
  WALLET_LOCKED = "WALLET_LOCKED",
  USER_REJECTED = "USER_REJECTED",
  WRONG_NETWORK = "WRONG_NETWORK",
  INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS",
  
  // Contract errors
  CONTRACT_NOT_CONFIGURED = "CONTRACT_NOT_CONFIGURED",
  INVALID_CONTRACT_ADDRESS = "INVALID_CONTRACT_ADDRESS",
  TRANSACTION_FAILED = "TRANSACTION_FAILED",
  GAS_ESTIMATION_FAILED = "GAS_ESTIMATION_FAILED",
  
  // API errors
  API_ERROR = "API_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
  UNAUTHORIZED = "UNAUTHORIZED",
  NOT_FOUND = "NOT_FOUND",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  
  // Session errors
  SESSION_EXPIRED = "SESSION_EXPIRED",
  INVALID_SIGNATURE = "INVALID_SIGNATURE",
  
  // General errors
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
  TIMEOUT = "TIMEOUT",
}

/**
 * Base error class for all Weavrn errors
 */
export class WeavrnError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public userMessage: string,
    public originalError?: unknown,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = "WeavrnError";
    
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WeavrnError);
    }
  }

  /**
   * Returns a user-friendly error message suitable for display
   */
  getUserMessage(): string {
    return this.userMessage;
  }

  /**
   * Returns true if this error should be reported to error tracking
   */
  shouldReport(): boolean {
    // Don't report user-initiated errors
    const ignoredCodes = [
      ErrorCode.USER_REJECTED,
      ErrorCode.WALLET_LOCKED,
      ErrorCode.WALLET_NOT_FOUND,
    ];
    return !ignoredCodes.includes(this.code);
  }

  /**
   * Converts error to a plain object for logging/reporting
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      userMessage: this.userMessage,
      metadata: this.metadata,
      stack: this.stack,
    };
  }
}

/**
 * Wallet-related errors
 */
export class WalletError extends WeavrnError {
  constructor(
    code: ErrorCode,
    userMessage: string,
    originalError?: unknown,
    metadata?: Record<string, unknown>
  ) {
    super(`Wallet error: ${code}`, code, userMessage, originalError, metadata);
    this.name = "WalletError";
  }
}

/**
 * Smart contract interaction errors
 */
export class ContractError extends WeavrnError {
  constructor(
    code: ErrorCode,
    userMessage: string,
    originalError?: unknown,
    metadata?: Record<string, unknown>
  ) {
    super(`Contract error: ${code}`, code, userMessage, originalError, metadata);
    this.name = "ContractError";
  }
}

/**
 * API request errors
 */
export class APIError extends WeavrnError {
  constructor(
    code: ErrorCode,
    userMessage: string,
    public statusCode?: number,
    originalError?: unknown,
    metadata?: Record<string, unknown>
  ) {
    super(`API error: ${code}`, code, userMessage, originalError, metadata);
    this.name = "APIError";
  }
}

/**
 * Handles MetaMask/wallet errors and converts them to WeavrnError
 */
export function handleWalletError(error: unknown, context?: string): never {
  // Log full error for debugging
  if (process.env.NODE_ENV === "development") {
    console.error(`[WalletError${context ? ` - ${context}` : ""}]`, error);
  }

  // Handle known error codes
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: number | string }).code;
    
    // User rejected transaction
    if (code === 4001 || code === "ACTION_REJECTED") {
      throw new WalletError(
        ErrorCode.USER_REJECTED,
        "You cancelled the transaction. Please try again if you want to proceed.",
        error
      );
    }
    
    // Insufficient funds
    if (code === -32603 || code === "INSUFFICIENT_FUNDS") {
      throw new WalletError(
        ErrorCode.INSUFFICIENT_FUNDS,
        "You don't have enough ETH to complete this transaction. Please add funds to your wallet.",
        error
      );
    }
    
    // Wrong network
    if (code === 4902 || code === "UNSUPPORTED_OPERATION") {
      throw new WalletError(
        ErrorCode.WRONG_NETWORK,
        "Please switch to the correct network in your wallet.",
        error
      );
    }
  }

  // Handle error messages
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message: string }).message.toLowerCase();
    
    if (message.includes("user rejected") || message.includes("user denied")) {
      throw new WalletError(
        ErrorCode.USER_REJECTED,
        "You cancelled the transaction.",
        error
      );
    }
    
    if (message.includes("insufficient funds")) {
      throw new WalletError(
        ErrorCode.INSUFFICIENT_FUNDS,
        "Insufficient funds to complete this transaction.",
        error
      );
    }
  }

  // Generic wallet error
  throw new WalletError(
    ErrorCode.UNKNOWN_ERROR,
    "An unexpected wallet error occurred. Please try again or contact support.",
    error
  );
}

/**
 * Handles smart contract errors and converts them to WeavrnError
 */
export function handleContractError(error: unknown, context?: string): never {
  // Log full error for debugging
  if (process.env.NODE_ENV === "development") {
    console.error(`[ContractError${context ? ` - ${context}` : ""}]`, error);
  }

  // Check if it's a wallet error first
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: number | string }).code;
    if (code === 4001 || code === "ACTION_REJECTED") {
      return handleWalletError(error, context);
    }
  }

  // Handle contract revert errors
  if (error && typeof error === "object" && "reason" in error) {
    const reason = (error as { reason: string }).reason;
    throw new ContractError(
      ErrorCode.TRANSACTION_FAILED,
      `Transaction failed: ${reason}`,
      error,
      { reason }
    );
  }

  // Generic contract error
  throw new ContractError(
    ErrorCode.TRANSACTION_FAILED,
    "Transaction failed. Please check your inputs and try again.",
    error
  );
}

/**
 * Handles API errors and converts them to WeavrnError
 */
export function handleAPIError(error: unknown, context?: string): never {
  // Log full error for debugging
  if (process.env.NODE_ENV === "development") {
    console.error(`[APIError${context ? ` - ${context}` : ""}]`, error);
  }

  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    throw new APIError(
      ErrorCode.NETWORK_ERROR,
      "Network error. Please check your internet connection and try again.",
      undefined,
      error
    );
  }

  // Handle timeout errors
  if (error instanceof DOMException && error.name === "AbortError") {
    throw new APIError(
      ErrorCode.TIMEOUT,
      "Request timed out. Please try again.",
      undefined,
      error
    );
  }

  // Handle HTTP errors
  if (error && typeof error === "object" && "statusCode" in error) {
    const statusCode = (error as { statusCode: number }).statusCode;
    const message = (error as { message?: string }).message || "Unknown error";
    
    if (statusCode === 401) {
      throw new APIError(
        ErrorCode.UNAUTHORIZED,
        "Your session has expired. Please reconnect your wallet.",
        statusCode,
        error
      );
    }
    
    if (statusCode === 404) {
      throw new APIError(
        ErrorCode.NOT_FOUND,
        "The requested resource was not found.",
        statusCode,
        error
      );
    }
    
    if (statusCode === 429) {
      throw new APIError(
        ErrorCode.RATE_LIMIT_EXCEEDED,
        "Too many requests. Please wait a moment and try again.",
        statusCode,
        error
      );
    }
    
    if (statusCode >= 500) {
      throw new APIError(
        ErrorCode.API_ERROR,
        "Server error. Please try again later.",
        statusCode,
        error
      );
    }
    
    throw new APIError(
      ErrorCode.API_ERROR,
      message,
      statusCode,
      error
    );
  }

  // Generic API error
  throw new APIError(
    ErrorCode.API_ERROR,
    "An unexpected error occurred. Please try again.",
    undefined,
    error
  );
}

/**
 * Generic error handler that routes to specific handlers
 */
export function handleError(error: unknown, context?: string): never {
  // Already a WeavrnError, just re-throw
  if (error instanceof WeavrnError) {
    throw error;
  }

  // Try to determine error type and handle appropriately
  if (error && typeof error === "object") {
    // Wallet errors typically have a 'code' property
    if ("code" in error) {
      return handleWalletError(error, context);
    }
    
    // API errors typically have a 'statusCode' property
    if ("statusCode" in error) {
      return handleAPIError(error, context);
    }
  }

  // Unknown error type
  if (process.env.NODE_ENV === "development") {
    console.error(`[UnknownError${context ? ` - ${context}` : ""}]`, error);
  }

  throw new WeavrnError(
    "Unknown error",
    ErrorCode.UNKNOWN_ERROR,
    "An unexpected error occurred. Please try again or contact support.",
    error
  );
}

/**
 * Reports error to error tracking service (e.g., Sentry)
 */
export function reportError(error: WeavrnError): void {
  if (!error.shouldReport()) {
    return;
  }

  // In development, just log to console
  if (process.env.NODE_ENV === "development") {
    console.error("[Error Report]", error.toJSON());
    return;
  }

  // TODO: Integrate with error tracking service
  // Example: Sentry.captureException(error);
}

/**
 * Hook for displaying errors in UI
 */
export function getErrorDisplay(error: unknown): {
  title: string;
  message: string;
  code?: ErrorCode;
} {
  if (error instanceof WeavrnError) {
    return {
      title: getErrorTitle(error.code),
      message: error.getUserMessage(),
      code: error.code,
    };
  }

  return {
    title: "Error",
    message: "An unexpected error occurred. Please try again.",
    code: ErrorCode.UNKNOWN_ERROR,
  };
}

function getErrorTitle(code: ErrorCode): string {
  const titles: Record<ErrorCode, string> = {
    [ErrorCode.WALLET_NOT_FOUND]: "Wallet Not Found",
    [ErrorCode.WALLET_LOCKED]: "Wallet Locked",
    [ErrorCode.USER_REJECTED]: "Transaction Cancelled",
    [ErrorCode.WRONG_NETWORK]: "Wrong Network",
    [ErrorCode.INSUFFICIENT_FUNDS]: "Insufficient Funds",
    [ErrorCode.CONTRACT_NOT_CONFIGURED]: "Configuration Error",
    [ErrorCode.INVALID_CONTRACT_ADDRESS]: "Invalid Address",
    [ErrorCode.TRANSACTION_FAILED]: "Transaction Failed",
    [ErrorCode.GAS_ESTIMATION_FAILED]: "Gas Estimation Failed",
    [ErrorCode.API_ERROR]: "API Error",
    [ErrorCode.NETWORK_ERROR]: "Network Error",
    [ErrorCode.RATE_LIMIT_EXCEEDED]: "Rate Limit Exceeded",
    [ErrorCode.UNAUTHORIZED]: "Unauthorized",
    [ErrorCode.NOT_FOUND]: "Not Found",
    [ErrorCode.VALIDATION_ERROR]: "Validation Error",
    [ErrorCode.SESSION_EXPIRED]: "Session Expired",
    [ErrorCode.INVALID_SIGNATURE]: "Invalid Signature",
    [ErrorCode.UNKNOWN_ERROR]: "Error",
    [ErrorCode.TIMEOUT]: "Request Timeout",
  };

  return titles[code] || "Error";
}

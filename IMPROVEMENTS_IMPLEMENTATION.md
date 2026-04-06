# Frontend Improvements - Implementation Guide

## Quick Wins (Easy to Implement)

### 1. Create Error Utility Module
**File:** `src/lib/errors.ts` (NEW)

This centralizes error handling across the application.

```typescript
/**
 * Safely extracts error message from unknown error types
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as any).message);
  }
  return 'An unknown error occurred';
}

/**
 * Standardized error messages
 */
export const ERROR_MESSAGES = {
  WALLET_NOT_FOUND: 'Install MetaMask to continue',
  CHAIN_SWITCH_FAILED: (chainName: string) => `Switch to ${chainName} to continue`,
  SESSION_EXPIRED: 'Your session has expired. Please reconnect.',
  API_TIMEOUT: 'Request timed out. Please try again.',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  INVALID_INPUT: 'Please check your input and try again.',
  UPLOAD_FAILED: 'File upload failed. Please try again.',
  OPERATION_FAILED: 'Operation failed. Please try again.',
} as const;
```

**Usage in components:**
```typescript
import { getErrorMessage } from '@/lib/errors';

catch (err: unknown) {
  setError(getErrorMessage(err));
}
```

---

### 2. Create Constants Module
**File:** `src/lib/config.ts` (NEW)

Centralizes all magic numbers and configuration values.

```typescript
/**
 * API and network configuration
 */
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  POLL_INTERVAL_MS: 3000,
  MAX_POLL_INTERVAL_MS: 30000,
  DEBOUNCE_MS: 1000,
  DEFAULT_PAGE_LIMIT: 50,
  AUTO_CONNECT_TIMEOUT_MS: 180000,
} as const;

/**
 * UI configuration
 */
export const UI_CONFIG = {
  TOAST_DURATION_MS: 3000,
  ANIMATION_DURATION_MS: 300,
  MODAL_ANIMATION_MS: 200,
} as const;

/**
 * Validation rules
 */
export const VALIDATION = {
  MIN_PASSWORD_LENGTH: 8,
  MAX_BIO_LENGTH: 500,
  MAX_TITLE_LENGTH: 100,
  MAX_DESCRIPTION_LENGTH: 5000,
} as const;
```

**Usage:**
```typescript
import { API_CONFIG } from '@/lib/config';

const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
```

---

### 3. Extract Shared Markdown Component
**File:** `src/components/MarkdownRenderer.tsx` (NEW)

Eliminates duplication of markdown rendering logic.

```typescript
'use client';

import ReactMarkdown from 'react-markdown';

export const markdownComponents = {
  code({ className, children, ...props }: any) {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <pre className="bg-black/40 rounded p-2 my-1 overflow-x-auto">
          <code className="text-[10px] font-mono text-green-300" {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code className="bg-black/30 px-1 rounded text-[10px] font-mono text-weavrn-accent" {...props}>
        {children}
      </code>
    );
  },
  p({ children }: any) {
    return <p className="mb-1.5 last:mb-0">{children}</p>;
  },
  ul({ children }: any) {
    return <ul className="list-disc pl-4 mb-1.5 space-y-0.5">{children}</ul>;
  },
  ol({ children }: any) {
    return <ol className="list-decimal pl-4 mb-1.5 space-y-0.5">{children}</ol>;
  },
  li({ children }: any) {
    return <li>{children}</li>;
  },
  h1({ children }: any) {
    return <p className="font-bold text-white mb-1 text-sm">{children}</p>;
  },
  h2({ children }: any) {
    return <p className="font-bold text-white mb-1">{children}</p>;
  },
  h3({ children }: any) {
    return <p className="font-semibold text-white mb-1">{children}</p>;
  },
  strong({ children }: any) {
    return <strong className="text-white font-semibold">{children}</strong>;
  },
  a({ href, children }: any) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-weavrn-accent hover:underline"
      >
        {children}
      </a>
    );
  },
  hr() {
    return <hr className="border-weavrn-border/30 my-2" />;
  },
  blockquote({ children }: any) {
    return (
      <blockquote className="border-l-2 border-weavrn-accent/30 pl-2 italic opacity-80">
        {children}
      </blockquote>
    );
  },
  table({ children }: any) {
    return <table className="text-[10px] w-full my-1">{children}</table>;
  },
  th({ children }: any) {
    return (
      <th className="text-left font-semibold pb-1 pr-2 border-b border-weavrn-border/30">
        {children}
      </th>
    );
  },
  td({ children }: any) {
    return <td className="py-0.5 pr-2">{children}</td>;
  },
} as const;

interface MarkdownContentProps {
  content: string;
  className?: string;
}

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
  return (
    <div className={`text-xs text-weavrn-muted leading-relaxed ${className}`}>
      <ReactMarkdown components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
```

**Usage in JobChat.tsx:**
```typescript
import { MarkdownContent } from '@/components/MarkdownRenderer';

// Replace the ChatMarkdown component with:
{m.role === 'agent' ? (
  <MarkdownContent content={m.content} />
) : (
  <div className="whitespace-pre-wrap">{m.content}</div>
)}
```

---

### 4. Improve Error Handling in WalletConnect
**File:** `src/components/WalletConnect.tsx`

Replace loose error handling with the new utility:

```typescript
import { getErrorMessage, ERROR_MESSAGES } from '@/lib/errors';

const connect = useCallback(async () => {
  if (!window.ethereum) {
    setError(ERROR_MESSAGES.WALLET_NOT_FOUND);
    return;
  }
  setConnecting(true);
  setError(null);
  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    const switched = await checkAndSwitchChain();
    if (!switched) {
      setError(ERROR_MESSAGES.CHAIN_SWITCH_FAILED(getChainConfig().name));
      return;
    }
    const { signer, address: addr } = await getProviderAndSigner();
    onConnect(addr, signer);
  } catch (err: unknown) {
    const e = err as { code?: number };
    if (e.code === 4001) return; // user rejected
    setError(getErrorMessage(err));
  } finally {
    setConnecting(false);
  }
}, [onConnect]);
```

---

### 5. Add Environment Variable Validation
**File:** `src/lib/env.ts` (NEW)

```typescript
/**
 * Validates that required environment variables are set
 * Throws error at module load time if any are missing
 */
function validateEnvironment() {
  const required = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_CHAIN_ID',
  ];

  const optional = [
    'NEXT_PUBLIC_SOCIAL_MINING_ADDRESS',
    'NEXT_PUBLIC_WVRN_TOKEN_ADDRESS',
    'NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS',
    'NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS',
    'NEXT_PUBLIC_ESCROW_ROUTER_ADDRESS',
    'NEXT_PUBLIC_USAGE_INCENTIVES_ADDRESS',
    'NEXT_PUBLIC_MERKLE_REWARDS_ADDRESS',
    'NEXT_PUBLIC_RPC_URL',
  ];

  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env.local file.`
    );
  }

  const unset = optional.filter(v => !process.env[v]);
  if (unset.length > 0) {
    console.warn(
      `Optional environment variables not set: ${unset.join(', ')}\n` +
      `Some features may not work correctly.`
    );
  }
}

// Validate on module load
if (typeof window === 'undefined') {
  // Only validate on server side to avoid issues in browser
  validateEnvironment();
}

export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  CHAIN_ID: process.env.NEXT_PUBLIC_CHAIN_ID || '84532',
  RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || '',
  SOCIAL_MINING_ADDRESS: process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || '',
  WVRN_TOKEN_ADDRESS: process.env.NEXT_PUBLIC_WVRN_TOKEN_ADDRESS || '',
  AGENT_REGISTRY_ADDRESS: process.env.NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS || '',
  PAYMENT_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_PAYMENT_ROUTER_ADDRESS || '',
  ESCROW_ROUTER_ADDRESS: process.env.NEXT_PUBLIC_ESCROW_ROUTER_ADDRESS || '',
  USAGE_INCENTIVES_ADDRESS: process.env.NEXT_PUBLIC_USAGE_INCENTIVES_ADDRESS || '',
  MERKLE_REWARDS_ADDRESS: process.env.NEXT_PUBLIC_MERKLE_REWARDS_ADDRESS || '',
} as const;
```

---

### 6. Add Error Boundary Component
**File:** `src/components/ErrorBoundary.tsx` (NEW)

```typescript
'use client';

import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service (e.g., Sentry)
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm font-semibold mb-2">
              Something went wrong
            </p>
            <p className="text-red-300 text-xs mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded text-xs text-red-400 transition-colors"
            >
              Reload Page
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
```

**Usage in layout.tsx:**
```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <TestnetBanner />
          {children}
          {/* Analytics script */}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

### 7. Improve CSP Header
**File:** `next.config.mjs`

Replace the permissive CSP with a stricter one:

```javascript
headers: async () => [
  {
    source: "/:path*",
    headers: [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'wasm-unsafe-eval'", // For ethers.js
          "style-src 'self' 'unsafe-inline'",     // Tailwind requires this
          "img-src 'self' data: https:",
          "connect-src 'self' https: wss:",
          "font-src 'self' data:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
    ],
  },
],
```

---

### 8. Add Input Validation
**File:** `src/lib/validation.ts` (NEW)

```typescript
/**
 * Validates service request inputs
 */
export function validateServiceRequest(data: {
  description?: string;
  initialMessage?: string;
  title?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (data.description) {
    if (data.description.trim().length < 10) {
      errors.push('Description must be at least 10 characters');
    }
    if (data.description.length > 5000) {
      errors.push('Description must be less than 5000 characters');
    }
  }

  if (data.initialMessage) {
    if (data.initialMessage.length > 10000) {
      errors.push('Message must be less than 10000 characters');
    }
  }

  if (data.title) {
    if (data.title.trim().length < 3) {
      errors.push('Title must be at least 3 characters');
    }
    if (data.title.length > 100) {
      errors.push('Title must be less than 100 characters');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validates wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Validates URL format
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
```

---

## Medium Effort Improvements

### 9. Improve JobChat Polling with Exponential Backoff

**File:** `src/components/JobChat.tsx`

```typescript
const [pollInterval, setPollInterval] = useState(API_CONFIG.POLL_INTERVAL_MS);
const [lastFetchTime, setLastFetchTime] = useState(0);
const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

const fetchMessages = useCallback(async () => {
  const now = Date.now();
  // Debounce rapid calls
  if (now - lastFetchTime < 500) return;

  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    const res = await fetch(
      `${API_URL}/jobs/${jobId}/messages?wallet_address=${walletAddress.toLowerCase()}`
    );
    if (!res.ok) return;
    const data = await res.json();
    
    setMessages((prev) => {
      if (data.messages.length !== prev.length) {
        if (data.messages.length > prev.length && waiting) {
          const lastMsg = data.messages[data.messages.length - 1];
          if (lastMsg.role === "agent" || lastMsg.role === "system") {
            setWaiting(false);
          }
        }
        return data.messages;
      }
      return prev;
    });
    
    setLastFetchTime(now);
    // Reset interval on success
    setPollInterval(API_CONFIG.POLL_INTERVAL_MS);
  } catch {
    // Exponential backoff on error
    setPollInterval((prev) =>
      Math.min(prev * 1.5, API_CONFIG.MAX_POLL_INTERVAL_MS)
    );
  } finally {
    setLoading(false);
  }
}, [jobId, walletAddress, waiting]);

useEffect(() => {
  fetchMessages();
  pollRef.current = setInterval(fetchMessages, pollInterval);
  return () => {
    if (pollRef.current) clearInterval(pollRef.current);
  };
}, [fetchMessages, pollInterval]);
```

---

### 10. Add Request Deduplication to API Layer

**File:** `src/lib/api.ts`

```typescript
// Add at the top of the file
const requestCache = new Map<string, Promise<any>>();

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  // Create cache key
  const cacheKey = `${path}:${JSON.stringify(options || {})}`;
  
  // Return cached promise if request is in flight
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  if (hasSession()) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);
  
  const promise = fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    signal: controller.signal,
  })
    .then(async (res) => {
      clearTimeout(timeout);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const msg = body.message || body.error || res.statusText;
        throw new Error(msg);
      }
      return res.json() as Promise<T>;
    })
    .finally(() => {
      // Remove from cache after a short delay
      setTimeout(() => requestCache.delete(cacheKey), 100);
    });

  requestCache.set(cacheKey, promise);
  return promise;
}
```

---

## Documentation Improvements

### 11. Add JSDoc Comments

**File:** `src/lib/api.ts`

```typescript
/**
 * Creates a session token for authenticated API requests
 * @param signer - JsonRpcSigner instance for message signing
 * @param walletAddress - User's wallet address (will be lowercased)
 * @returns Promise with session token and expiration time
 * @throws Error if signing fails or API returns error
 * @example
 * const { token, expires_at } = await createSession(signer, address);
 */
export async function createSession(
  signer: import("ethers").JsonRpcSigner,
  walletAddress: string
): Promise<{ token: string; expires_at: string }> {
  // ...
}

/**
 * Retrieves rewards data for a wallet
 * @param wallet - Wallet address to fetch rewards for
 * @returns Promise with rewards, tracked posts, and block rewards
 * @throws Error if wallet not found or API error
 */
export function getRewards(wallet: string): Promise<RewardsResponse> {
  // ...
}
```

---

## Testing Improvements

### 12. Add Unit Tests

**File:** `src/lib/__tests__/errors.test.ts` (NEW)

```typescript
import { getErrorMessage, ERROR_MESSAGES } from '@/lib/errors';

describe('getErrorMessage', () => {
  it('should extract message from Error object', () => {
    const error = new Error('Test error');
    expect(getErrorMessage(error)).toBe('Test error');
  });

  it('should handle string errors', () => {
    expect(getErrorMessage('String error')).toBe('String error');
  });

  it('should handle unknown errors', () => {
    expect(getErrorMessage({})).toBe('An unknown error occurred');
  });

  it('should handle null/undefined', () => {
    expect(getErrorMessage(null)).toBe('An unknown error occurred');
    expect(getErrorMessage(undefined)).toBe('An unknown error occurred');
  });
});
```

---

## Summary of Changes

| File | Type | Priority | Effort |
|------|------|----------|--------|
| `src/lib/errors.ts` | New | High | Low |
| `src/lib/config.ts` | New | High | Low |
| `src/components/MarkdownRenderer.tsx` | New | Medium | Low |
| `src/lib/env.ts` | New | High | Low |
| `src/components/ErrorBoundary.tsx` | New | Medium | Low |
| `next.config.mjs` | Update | High | Low |
| `src/lib/validation.ts` | New | Medium | Low |
| `src/components/JobChat.tsx` | Update | Medium | Medium |
| `src/lib/api.ts` | Update | Medium | Medium |
| `src/components/WalletConnect.tsx` | Update | Low | Low |
| JSDoc comments | Update | Low | Low |
| Tests | New | Low | Medium |

---

## Implementation Order

1. **Week 1 (Quick Wins)**
   - Create `errors.ts`, `config.ts`, `env.ts`
   - Create `MarkdownRenderer.tsx`
   - Update CSP header
   - Update error handling in `WalletConnect.tsx`

2. **Week 2 (Core Improvements)**
   - Create `ErrorBoundary.tsx` and integrate
   - Create `validation.ts`
   - Add JSDoc comments to key functions

3. **Week 3 (Performance)**
   - Improve `JobChat.tsx` polling
   - Add request deduplication to `api.ts`

4. **Week 4 (Testing & Polish)**
   - Add unit tests
   - Code review and refinement
   - Performance testing

---

## Testing Checklist

- [ ] All TypeScript errors resolved
- [ ] No console warnings
- [ ] Error boundary catches and displays errors
- [ ] Wallet connection works smoothly
- [ ] API requests deduplicate correctly
- [ ] Polling with exponential backoff works
- [ ] Markdown rendering consistent across components
- [ ] CSP header doesn't block legitimate resources
- [ ] Environment variables validated on startup
- [ ] All new components have tests


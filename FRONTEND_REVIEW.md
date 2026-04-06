# Weavrn Frontend Code Review

## Executive Summary

Your frontend codebase is well-structured with modern React/Next.js practices, good TypeScript coverage, and solid security foundations. The review identified several areas for improvement across performance, code quality, maintainability, and security hardening.

---

## 📋 Findings by Category

### 1. **Security Issues** 🔒

#### 1.1 CSP Header Too Permissive (Medium)
**File:** `next.config.mjs`
**Issue:** CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts, which weakens protection against XSS attacks.

```javascript
// Current (permissive)
"script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```

**Recommendation:** Remove `'unsafe-eval'` and use nonce-based inline scripts instead of `'unsafe-inline'`.

---

#### 1.2 Missing MERKLE_REWARDS_ABI Completion (High)
**File:** `src/lib/contracts.ts` (line ~850)
**Issue:** The file ends abruptly with `const MERKLE_REWARDS_ABI = [` - the ABI definition is incomplete, which will cause a syntax error.

**Recommendation:** Complete the ABI definition or remove if not yet implemented.

---

#### 1.3 Incomplete API Function (High)
**File:** `src/lib/api.ts` (end of file)
**Issue:** Function `deliverJob` is incomplete - ends with `export asyn` (missing `c`).

**Recommendation:** Complete the function definition.

---

#### 1.4 Missing Environment Variable Validation
**File:** `src/lib/contracts.ts`, `src/lib/api.ts`
**Issue:** No validation that required environment variables are set before use. Missing addresses will silently fail.

**Recommendation:** Add validation at module load time:
```typescript
function validateEnv() {
  const required = [
    'NEXT_PUBLIC_API_URL',
    'NEXT_PUBLIC_CHAIN_ID',
  ];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
}
```

---

### 2. **Performance Issues** ⚡

#### 2.1 Inefficient Polling in JobChat
**File:** `src/components/JobChat.tsx` (lines 80-88)
**Issue:** Polling every 3 seconds without exponential backoff or request deduplication. Can cause excessive API calls.

**Recommendation:**
```typescript
// Add exponential backoff and request deduplication
const [lastFetchTime, setLastFetchTime] = useState(0);
const [pollInterval, setPollInterval] = useState(3000);

const fetchMessages = useCallback(async () => {
  const now = Date.now();
  if (now - lastFetchTime < 1000) return; // Debounce
  
  try {
    // ... fetch logic
    setLastFetchTime(now);
    setPollInterval(3000); // Reset on success
  } catch {
    setPollInterval(Math.min(pollInterval * 1.5, 30000)); // Backoff
  }
}, [lastFetchTime, pollInterval]);
```

---

#### 2.2 Missing Image Optimization
**File:** `next.config.mjs`
**Issue:** `images.unoptimized: true` disables Next.js image optimization. This impacts performance for SVG/PNG assets.

**Recommendation:** Enable optimization and use `<Image>` component:
```typescript
// next.config.mjs
images: {
  unoptimized: false,
  formats: ['image/avif', 'image/webp'],
}
```

---

#### 2.3 No Request Deduplication
**File:** `src/lib/api.ts`
**Issue:** Multiple simultaneous requests to the same endpoint aren't deduplicated, causing redundant API calls.

**Recommendation:** Add request caching:
```typescript
const requestCache = new Map<string, Promise<any>>();

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const cacheKey = `${path}:${JSON.stringify(options)}`;
  
  if (requestCache.has(cacheKey)) {
    return requestCache.get(cacheKey)!;
  }
  
  const promise = performFetch<T>(path, options);
  requestCache.set(cacheKey, promise);
  
  try {
    return await promise;
  } finally {
    setTimeout(() => requestCache.delete(cacheKey), 100);
  }
}
```

---

### 3. **Code Quality Issues** 🧹

#### 3.1 Type Safety: Loose Error Handling
**File:** Multiple files (`WalletConnect.tsx`, `JobChat.tsx`, `AgentDashboard.tsx`)
**Issue:** Error handling uses `as { message?: string }` pattern, which is fragile.

**Recommendation:** Create a utility function:
```typescript
// lib/errors.ts
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

// Usage
catch (err: unknown) {
  setError(getErrorMessage(err));
}
```

---

#### 3.2 Duplicate Markdown Rendering Logic
**File:** `src/components/JobChat.tsx`, `src/components/DeliverableView.tsx`
**Issue:** Identical `ReactMarkdown` configuration duplicated across components.

**Recommendation:** Extract to shared component:
```typescript
// components/MarkdownRenderer.tsx
export const markdownComponents = {
  code({ className, children, ...props }) { /* ... */ },
  p({ children }) { /* ... */ },
  // ... rest of config
};

export function MarkdownContent({ content }: { content: string }) {
  return <ReactMarkdown components={markdownComponents}>{content}</ReactMarkdown>;
}
```

---

#### 3.3 Missing Null Checks
**File:** `src/components/ListingDetail.tsx` (line 145)
**Issue:** `listing.input_schema!` uses non-null assertion without prior validation.

**Recommendation:**
```typescript
if (hasSchema && listing.input_schema) {
  for (const field of listing.input_schema) {
    // ...
  }
}
```

---

#### 3.4 Hardcoded Strategy Addresses
**File:** `src/lib/contracts.ts` (lines 450-455)
**Issue:** Strategy addresses are hardcoded for Base Sepolia only. Will break on mainnet.

**Recommendation:**
```typescript
const STRATEGY_ADDRESSES: Record<string, Record<string, string>> = {
  "84532": { // Base Sepolia
    "0xbadf7908c00fcca8cc136ae4d7669eb72abf4829": "all_or_nothing",
  },
  "8453": { // Base Mainnet
    "0x...": "all_or_nothing",
  },
};

export function getStrategyType(strategyAddress: string | null): string {
  const chainId = process.env.NEXT_PUBLIC_CHAIN_ID || "84532";
  const strategies = STRATEGY_ADDRESSES[chainId] || {};
  return strategies[strategyAddress?.toLowerCase() || ""] || "unknown";
}
```

---

### 4. **Maintainability Issues** 📚

#### 4.1 Magic Numbers and Strings
**File:** Multiple files
**Issue:** Hardcoded values like `30000` (timeout), `3000` (poll interval), `50` (page limit) scattered throughout.

**Recommendation:** Centralize in constants:
```typescript
// lib/constants.ts
export const API_CONFIG = {
  TIMEOUT_MS: 30000,
  POLL_INTERVAL_MS: 3000,
  MAX_POLL_INTERVAL_MS: 30000,
  DEFAULT_PAGE_LIMIT: 50,
  AUTO_CONNECT_TIMEOUT_MS: 180000,
} as const;
```

---

#### 4.2 Inconsistent Error Messages
**File:** Various components
**Issue:** Error messages vary in format and detail level, making debugging harder.

**Recommendation:** Create error message constants:
```typescript
// lib/errorMessages.ts
export const ERRORS = {
  WALLET_NOT_FOUND: "Install MetaMask to continue",
  CHAIN_SWITCH_FAILED: (chainName: string) => `Switch to ${chainName} to continue`,
  SESSION_EXPIRED: "Your session has expired. Please reconnect.",
  API_TIMEOUT: "Request timed out. Please try again.",
} as const;
```

---

#### 4.3 Missing JSDoc Comments
**File:** `src/lib/api.ts`, `src/lib/contracts.ts`
**Issue:** Complex functions lack documentation, making it hard to understand parameters and return values.

**Recommendation:** Add JSDoc:
```typescript
/**
 * Creates a session token for authenticated API requests
 * @param signer - JsonRpcSigner instance for message signing
 * @param walletAddress - User's wallet address (will be lowercased)
 * @returns Promise with session token and expiration time
 * @throws Error if signing fails
 */
export async function createSession(
  signer: JsonRpcSigner,
  walletAddress: string
): Promise<{ token: string; expires_at: string }> {
  // ...
}
```

---

### 5. **Accessibility Issues** ♿

#### 5.1 Missing ARIA Labels
**File:** `src/components/AppHeader.tsx` (line 45)
**Issue:** Menu toggle button has `aria-label` but other interactive elements don't.

**Recommendation:** Add ARIA labels to all interactive elements:
```typescript
<button
  onClick={connect}
  aria-label="Connect wallet to Weavrn"
  className="..."
>
  Connect Wallet
</button>
```

---

#### 5.2 Color Contrast Issues
**File:** `src/app/globals.css`
**Issue:** Muted text (`#6B7280`) on dark background may not meet WCAG AA standards.

**Recommendation:** Test with tools like WebAIM Contrast Checker and adjust:
```css
:root {
  --foreground: #E5E7EB; /* Good */
  --muted: #9CA3AF; /* Improved from #6B7280 */
}
```

---

### 6. **Testing & Validation** 🧪

#### 6.1 No Input Validation
**File:** `src/components/ListingDetail.tsx`
**Issue:** Form inputs aren't validated before submission (only checked for presence).

**Recommendation:** Add validation library:
```typescript
import { z } from 'zod';

const ListingRequestSchema = z.object({
  description: z.string().min(10).max(5000),
  initialMessage: z.string().max(10000),
});

const handleRequestService = async () => {
  try {
    const validated = ListingRequestSchema.parse({
      description,
      initialMessage,
    });
    // ... proceed
  } catch (err) {
    setRequestError(err.errors[0].message);
  }
};
```

---

#### 6.2 No Error Boundary
**File:** `src/app/layout.tsx`
**Issue:** No error boundary to catch component crashes.

**Recommendation:** Add error boundary:
```typescript
// components/ErrorBoundary.tsx
'use client';

import { ReactNode } from 'react';

export class ErrorBoundary extends React.Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
          <p className="text-red-400">Something went wrong. Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### 7. **Build & Deployment** 🚀

#### 7.1 Static Export Limitations
**File:** `next.config.mjs`
**Issue:** `output: "export"` prevents using dynamic routes and API routes. May limit future features.

**Recommendation:** Document this limitation and consider serverless deployment for future scalability.

---

#### 7.2 Missing Build Verification
**File:** Package scripts
**Issue:** No lint or type-check in build pipeline.

**Recommendation:** Update `package.json`:
```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "lint": "next lint",
    "build": "npm run type-check && npm run lint && next build",
    "test": "jest"
  }
}
```

---

## 🔧 Suggested Improvements (Priority Order)

### Critical (Fix Immediately)
1. **Complete `MERKLE_REWARDS_ABI` definition** - Syntax error
2. **Complete `deliverJob` function** - Syntax error
3. **Fix CSP header** - Security risk
4. **Add environment variable validation** - Runtime safety

### High (Next Sprint)
5. Add error boundary component
6. Extract shared markdown rendering
7. Centralize magic numbers and error messages
8. Add input validation with Zod

### Medium (Next 2 Sprints)
9. Improve polling with exponential backoff
10. Add request deduplication
11. Add JSDoc comments to complex functions
12. Fix hardcoded strategy addresses

### Low (Nice to Have)
13. Enable image optimization
14. Add ARIA labels
15. Improve color contrast
16. Add comprehensive test suite

---

## 📊 Code Quality Metrics

| Metric | Status | Notes |
|--------|--------|-------|
| TypeScript Coverage | ✅ Good | Strict mode enabled, mostly typed |
| Error Handling | ⚠️ Needs Work | Inconsistent patterns, loose types |
| Code Duplication | ⚠️ Moderate | Markdown rendering duplicated |
| Security | ⚠️ Fair | CSP too permissive, missing validation |
| Accessibility | ⚠️ Needs Work | Missing ARIA labels, contrast issues |
| Performance | ⚠️ Fair | Inefficient polling, no caching |
| Documentation | ⚠️ Minimal | Few JSDoc comments |

---

## 🎯 Next Steps

1. **Week 1:** Fix critical syntax errors and security issues
2. **Week 2:** Refactor error handling and extract shared components
3. **Week 3:** Add validation and improve performance
4. **Week 4:** Add tests and documentation

---

## 📝 Notes

- The codebase follows Next.js 14 best practices well
- Good use of feature flags for conditional rendering
- Wallet integration is solid with proper event listeners
- Consider adding Sentry or similar for production error tracking
- API layer is well-structured with session management

---

**Review Date:** 2024
**Reviewer:** Code Review Agent
**Status:** Ready for Implementation

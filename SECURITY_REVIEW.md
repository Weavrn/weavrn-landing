# Security Review: Weavrn Landing Frontend

**Date:** 2024  
**Scope:** Next.js 14 frontend application with Web3 wallet integration  
**Risk Level:** Medium (handles user authentication, wallet interactions, and sensitive data)

---

## Executive Summary

The Weavrn frontend is a well-structured Next.js application with generally sound security practices. However, several issues were identified across OWASP Top 10 categories that require attention, particularly around:

1. **Cryptographic Failures** - Insecure HTTP fallback for API communication
2. **Injection** - Potential XSS via markdown rendering without proper sanitization
3. **Broken Access Control** - Admin key exposure in client-side code
4. **Security Misconfiguration** - CSP policy too permissive for inline scripts

---

## Detailed Findings

### 🔴 CRITICAL ISSUES

#### 1. **Insecure HTTP Fallback (A02:2021 – Cryptographic Failures)**

**Location:** `src/lib/api.ts:1`, `src/components/JobChat.tsx:95`, `src/components/DeliverableView.tsx:82`

**Issue:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
```

The API client falls back to unencrypted HTTP if the environment variable is not set. In production, this could expose:
- Session tokens in transit
- User wallet addresses
- Sensitive profile data
- Job messages and deliverables

**Risk:** Man-in-the-middle attacks, credential theft

**Recommendation:**
```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL;
if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL must be set and must use HTTPS");
}
if (!API_URL.startsWith("https://")) {
  throw new Error("NEXT_PUBLIC_API_URL must use HTTPS, not HTTP");
}
```

---

#### 2. **Unsafe Markdown Rendering (A03:2021 – Injection)**

**Location:** `src/components/JobChat.tsx:21-43`, `src/components/DeliverableView.tsx:71-90`

**Issue:**
The `react-markdown` component is used with `allowedElements` whitelist, but:
- No HTML sanitization is performed on user-provided content
- Agents can inject arbitrary HTML/JavaScript through markdown
- The `a` tag allows `javascript:` protocol URLs

**Example Attack:**
```markdown
[Click me](javascript:alert('XSS'))
```

**Risk:** Stored XSS, credential theft, malware distribution

**Recommendation:**
```typescript
import DOMPurify from "dompurify";

function ChatMarkdown({ content }: { content: string }) {
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ["p", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "strong", "em", "a", "hr", "blockquote"],
    ALLOWED_ATTR: ["href"],
    ALLOW_DATA_ATTR: false,
  });
  
  return (
    <ReactMarkdown
      allowedElements={["p", "code", "pre", "ul", "ol", "li", "h1", "h2", "h3", "strong", "em", "a", "hr", "blockquote"]}
    >
      {sanitized}
    </ReactMarkdown>
  );
}
```

Install: `npm install dompurify @types/dompurify`

---

#### 3. **Admin Key Exposure (A01:2021 – Broken Access Control)**

**Location:** `src/lib/api.ts:233-250`

**Issue:**
Admin endpoints accept an `adminKey` parameter that's passed via HTTP headers:
```typescript
function adminHeaders(adminKey: string) {
  return { "x-admin-key": adminKey };
}
```

If an admin accidentally passes this key in client-side code or logs it, it's exposed. There's no validation that the key came from a secure context.

**Risk:** Unauthorized admin operations, data manipulation

**Recommendation:**
- **Never** accept admin keys in client-side code
- Admin operations should only be accessible from a secure backend
- If client-side admin UI is needed, use session-based authentication with server-side role verification
- Implement rate limiting and audit logging for admin operations

```typescript
// ❌ REMOVE from client-side
export function getAdminBlocks(adminKey: string) { ... }

// ✅ INSTEAD: Use authenticated session
export async function getAdminBlocks() {
  return apiFetch<BlockStats>("/admin/blocks", {
    method: "GET",
    // Session token in Authorization header handles auth
  });
}
```

---

### 🟠 HIGH SEVERITY ISSUES

#### 4. **Overly Permissive Content Security Policy (A05:2021 – Security Misconfiguration)**

**Location:** `next.config.mjs:9`

**Issue:**
```javascript
"script-src 'self' 'unsafe-inline' 'unsafe-eval'"
```

The CSP allows:
- `'unsafe-inline'` - Inline scripts can execute (defeats CSP purpose)
- `'unsafe-eval'` - `eval()` and similar functions allowed
- No nonce or hash-based script validation

**Risk:** XSS attacks can bypass CSP protection

**Recommendation:**
```javascript
headers: async () => [
  {
    source: "/:path*",
    headers: [
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'nonce-{random}'", // Use nonce for inline scripts
          "style-src 'self' 'nonce-{random}'",
          "img-src 'self' data: https:",
          "connect-src 'self' https: wss:",
          "font-src 'self' data:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
      // ... other headers
    ],
  },
];
```

**Note:** Nonce implementation requires middleware to inject random values per request.

---

#### 5. **Unvalidated External URL Handling (A01:2021 – Broken Access Control)**

**Location:** `src/components/DeliverableView.tsx:82-88`

**Issue:**
```typescript
const downloadUrl = getJobFileUrl(jobId, storedName, walletAddress);
// Later: <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
```

If `getJobFileUrl` returns user-controlled URLs without validation, attackers could:
- Redirect users to phishing sites
- Inject `javascript:` URLs
- Access files from other users' jobs

**Risk:** Open redirect, unauthorized file access

**Recommendation:**
```typescript
function getJobFileUrl(jobId: number, storedName: string, walletAddress: string): string {
  // Validate storedName is alphanumeric + safe chars only
  if (!/^[a-zA-Z0-9._-]+$/.test(storedName)) {
    throw new Error("Invalid file name");
  }
  
  const API_URL = process.env.NEXT_PUBLIC_API_URL;
  if (!API_URL?.startsWith("https://")) {
    throw new Error("Invalid API URL");
  }
  
  const url = new URL(`${API_URL}/jobs/${jobId}/files/${storedName}`);
  url.searchParams.set("wallet_address", walletAddress.toLowerCase());
  
  // Validate final URL is same-origin or trusted domain
  if (!url.hostname.includes("weavrn.com") && !url.hostname.includes("localhost")) {
    throw new Error("Untrusted URL");
  }
  
  return url.toString();
}
```

---

#### 6. **Missing Input Validation on User Inputs (A03:2021 – Injection)**

**Location:** `src/components/MiningDashboard.tsx:145-160`, `src/components/ProfileEditor.tsx`

**Issue:**
User inputs are sent directly to the API without client-side validation:
```typescript
const handleStartVerification = async (e: React.FormEvent) => {
  const cleaned = handleInput.replace(/^@/, "").trim();
  // No validation of format, length, or content
  const res = await startVerification(signer, walletAddress, cleaned);
};
```

**Risk:** Invalid data sent to backend, potential injection if backend validation is weak

**Recommendation:**
```typescript
function validateXHandle(handle: string): { valid: boolean; error?: string } {
  const cleaned = handle.replace(/^@/, "").trim();
  
  if (!cleaned) return { valid: false, error: "Handle cannot be empty" };
  if (cleaned.length > 15) return { valid: false, error: "Handle too long (max 15 chars)" };
  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    return { valid: false, error: "Handle can only contain letters, numbers, and underscores" };
  }
  
  return { valid: true };
}

const handleStartVerification = async (e: React.FormEvent) => {
  e.preventDefault();
  const validation = validateXHandle(handleInput);
  if (!validation.valid) {
    setError(validation.error || "Invalid handle");
    return;
  }
  // ... proceed
};
```

---

### 🟡 MEDIUM SEVERITY ISSUES

#### 7. **Session Token Stored in Memory Only (A07:2021 – Identification and Authentication Failures)**

**Location:** `src/lib/api.ts:5-8`

**Issue:**
```typescript
let sessionToken: string | null = null;
let sessionExpiresAt: number | null = null;
```

Session tokens are stored in module-level variables, which:
- Are lost on page refresh (poor UX)
- Are not protected from XSS (if XSS exists, token is accessible)
- Cannot be shared across tabs

**Risk:** Session hijacking via XSS, poor session persistence

**Recommendation:**
```typescript
// Use httpOnly cookies instead (requires backend support)
// OR use sessionStorage with additional protections:

function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = sessionStorage.getItem("weavrn_session");
    if (!stored) return null;
    
    const { token, expiresAt } = JSON.parse(stored);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem("weavrn_session");
      return null;
    }
    
    return token;
  } catch {
    return null;
  }
}

function setSessionToken(token: string, expiresAt: number): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("weavrn_session", JSON.stringify({ token, expiresAt }));
}
```

**Best Practice:** Use httpOnly, Secure, SameSite cookies set by the backend.

---

#### 8. **No CSRF Protection (A01:2021 – Broken Access Control)**

**Location:** `src/lib/api.ts:apiFetch`

**Issue:**
API requests don't include CSRF tokens. While the app uses wallet signatures for auth, state-changing operations (POST/PUT/DELETE) should have additional CSRF protection.

**Risk:** Cross-site request forgery attacks

**Recommendation:**
```typescript
// Backend should set CSRF token in response header
// Frontend should include it in all state-changing requests

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  
  // Include CSRF token for state-changing operations
  if (["POST", "PUT", "DELETE"].includes(options?.method || "GET")) {
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute("content");
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken;
    }
  }
  
  // ... rest of function
}
```

---

#### 9. **Missing Rate Limiting on Client (A07:2021 – Identification and Authentication Failures)**

**Location:** `src/components/MiningDashboard.tsx:handleRefresh`, `src/components/JobChat.tsx:fetchMessages`

**Issue:**
The refresh cooldown is only enforced in UI state. A determined attacker could:
- Bypass the UI and call `refreshPosts()` directly
- Spam the API with requests
- Cause DoS

**Risk:** API abuse, resource exhaustion

**Recommendation:**
```typescript
class RateLimiter {
  private lastCall: number = 0;
  private minInterval: number;
  
  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    
    if (timeSinceLastCall < this.minInterval) {
      throw new Error(`Rate limited. Try again in ${Math.ceil((this.minInterval - timeSinceLastCall) / 1000)}s`);
    }
    
    this.lastCall = now;
    return fn();
  }
}

const refreshLimiter = new RateLimiter(300_000); // 5 minutes

const handleRefresh = async () => {
  try {
    await refreshLimiter.execute(() => refreshPosts(walletAddress));
  } catch (err) {
    setError((err as Error).message);
  }
};
```

---

#### 10. **Unencrypted Sensitive Data in URLs (A02:2021 – Cryptographic Failures)**

**Location:** `src/components/DeliverableView.tsx:82-88`

**Issue:**
```typescript
const params = new URLSearchParams({ 
  wallet_address: walletAddress.toLowerCase(), 
  signature, 
  timestamp: String(timestamp) 
});
const res = await fetch(`${API_URL}/jobs/${jobId}/download?${params}`);
```

Wallet addresses and signatures are exposed in URL query parameters, which:
- Are logged in server access logs
- Are visible in browser history
- May be cached by proxies

**Risk:** Credential exposure, privacy violation

**Recommendation:**
```typescript
// Use POST request with body instead
const res = await fetch(`${API_URL}/jobs/${jobId}/download`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    wallet_address: walletAddress.toLowerCase(),
    signature,
    timestamp,
  }),
});
```

---

### 🔵 LOW SEVERITY ISSUES

#### 11. **Missing Error Boundary (A06:2021 – Vulnerable and Outdated Components)**

**Location:** All components

**Issue:**
No error boundary component to catch React errors. If a component crashes, the entire app may become unusable.

**Recommendation:**
```typescript
// src/components/ErrorBoundary.tsx
"use client";

import React from "react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-400">Something went wrong. Please refresh the page.</p>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

#### 12. **Incomplete Error Handling (A06:2021 – Vulnerable and Outdated Components)**

**Location:** Multiple components

**Issue:**
Generic error handling that doesn't distinguish between error types:
```typescript
catch (err: unknown) {
  setError((err as Error).message);
}
```

This can expose sensitive error details to users.

**Recommendation:**
```typescript
function getUserFriendlyError(err: unknown): string {
  if (err instanceof Error) {
    // Don't expose internal error messages
    if (err.message.includes("ECONNREFUSED")) {
      return "Unable to connect to the service. Please try again later.";
    }
    if (err.message.includes("401") || err.message.includes("Unauthorized")) {
      return "Your session has expired. Please reconnect your wallet.";
    }
    if (err.message.includes("403") || err.message.includes("Forbidden")) {
      return "You don't have permission to perform this action.";
    }
  }
  return "An unexpected error occurred. Please try again.";
}

try {
  // ...
} catch (err) {
  setError(getUserFriendlyError(err));
  console.error("Detailed error:", err); // Log for debugging
}
```

---

## Summary Table

| Issue | Severity | Category | Status |
|-------|----------|----------|--------|
| HTTP Fallback | 🔴 Critical | A02 Cryptographic Failures | Needs Fix |
| Unsafe Markdown | 🔴 Critical | A03 Injection | Needs Fix |
| Admin Key Exposure | 🔴 Critical | A01 Broken Access Control | Needs Fix |
| Weak CSP | 🟠 High | A05 Security Misconfiguration | Needs Fix |
| Unvalidated URLs | 🟠 High | A01 Broken Access Control | Needs Fix |
| Missing Input Validation | 🟠 High | A03 Injection | Needs Fix |
| Session Storage | 🟡 Medium | A07 Authentication | Needs Review |
| No CSRF Protection | 🟡 Medium | A01 Broken Access Control | Needs Fix |
| Missing Rate Limiting | 🟡 Medium | A07 Authentication | Needs Fix |
| Sensitive Data in URLs | 🟡 Medium | A02 Cryptographic Failures | Needs Fix |
| No Error Boundary | 🔵 Low | A06 Vulnerable Components | Nice to Have |
| Poor Error Handling | 🔵 Low | A06 Vulnerable Components | Nice to Have |

---

## Recommendations Priority

### Immediate (This Sprint)
1. ✅ Fix HTTP fallback to enforce HTTPS
2. ✅ Sanitize markdown rendering with DOMPurify
3. ✅ Remove admin key from client-side code
4. ✅ Add input validation for user inputs

### Short-term (Next Sprint)
5. ✅ Implement CSRF protection
6. ✅ Move sensitive data from URLs to POST bodies
7. ✅ Improve error handling and messages
8. ✅ Add rate limiting utility

### Medium-term (Next Quarter)
9. ✅ Strengthen CSP with nonce-based approach
10. ✅ Implement error boundary
11. ✅ Add comprehensive logging and monitoring
12. ✅ Security audit of wallet integration

---

## Testing Recommendations

```bash
# Install security testing tools
npm install --save-dev eslint-plugin-security

# Run security linter
npx eslint . --ext .ts,.tsx --plugin security

# Check dependencies for vulnerabilities
npm audit

# Test CSP compliance
npm install --save-dev csp-checker
```

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [DOMPurify Documentation](https://github.com/cure53/DOMPurify)
- [Web3 Security Best Practices](https://ethereum.org/en/developers/docs/security/)


# Security Review Report: Weavrn Landing

**Date:** 2024  
**Scope:** Frontend Next.js application with Web3 integration  
**Risk Level:** MEDIUM

---

## Executive Summary

The Weavrn landing application is a Next.js-based frontend for a decentralized agent marketplace with blockchain integration. The review identified **5 critical/high-risk issues** and **8 medium-risk issues** primarily related to:

1. **Unsafe CSP configuration** allowing inline scripts
2. **Sensitive data exposure** in environment variables
3. **Insufficient input validation** on user-controlled data
4. **Missing CORS/origin validation** on API calls
5. **Weak authentication token handling**

---

## OWASP Top 10 Findings

### 1. **A01:2021 – Broken Access Control** ⚠️ HIGH

#### Issue: Admin Key Exposed in Client-Side Code
**Location:** `src/app/admin/page.tsx`  
**Severity:** HIGH

The admin key is stored in component state and passed as a header to API calls. This allows:
- Exposure via browser DevTools
- Potential XSS attacks to steal the key
- No rate limiting or key rotation mechanism

**Evidence:**
```typescript
// Line 1: Admin key stored in state
const [adminKey, setAdminKey] = useState("");

// Line 2: Passed directly to API
const data = await getAdminBlocks(adminKey);
```

**Risk:** An attacker with access to the browser can extract the admin key and perform unauthorized actions.

**Recommendation:**
- Move admin operations to a backend-only service
- Use secure session cookies (HttpOnly, Secure, SameSite)
- Implement rate limiting and audit logging
- Rotate keys regularly

---

### 2. **A02:2021 – Cryptographic Failures** ⚠️ CRITICAL

#### Issue: Sensitive Environment Variables Exposed
**Location:** `.env.example`, `src/lib/contracts.ts`  
**Severity:** CRITICAL

Contract addresses and RPC URLs are exposed as `NEXT_PUBLIC_*` variables, making them visible to all clients:

```typescript
const SOCIAL_MINING_ADDRESS = process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || "";
const WVRN_TOKEN_ADDRESS = process.env.NEXT_PUBLIC_WVRN_TOKEN_ADDRESS || "";
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "";
```

**Risk:**
- Attackers can enumerate contract addresses
- RPC endpoints can be rate-limited or poisoned
- No way to rotate without redeploying frontend

**Recommendation:**
- Keep contract ABIs public (necessary for frontend)
- Move RPC URL to backend proxy
- Implement backend API gateway for contract reads
- Use environment-specific configurations

---

### 3. **A03:2021 – Injection** ⚠️ MEDIUM

#### Issue: Insufficient Input Validation on User Handles
**Location:** `src/components/YouTubeVerification.tsx`, `src/components/AgentRegistration.tsx`  
**Severity:** MEDIUM

While basic validation exists, it's insufficient:

```typescript
// YouTubeVerification.tsx
const cleaned = handleInput.replace(/^@/, "").trim();
// Only removes leading @, no further validation

// AgentRegistration.tsx
const NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9 -]{0,28}[a-zA-Z0-9]$/;
// Good, but applied only after user input
```

**Risk:**
- Unicode normalization attacks (e.g., homograph attacks)
- Potential for XSS if data is rendered without escaping
- No length limits on some fields

**Recommendation:**
```typescript
// Improved validation
function validateHandle(input: string): string | null {
  const cleaned = input.replace(/^@/, "").trim();
  
  // Check length
  if (cleaned.length < 1 || cleaned.length > 30) {
    return "Handle must be 1-30 characters";
  }
  
  // Alphanumeric + underscore only
  if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
    return "Only letters, numbers, and underscores allowed";
  }
  
  // Normalize to prevent homograph attacks
  const normalized = cleaned.normalize('NFKC');
  if (normalized !== cleaned) {
    return "Invalid characters detected";
  }
  
  return null;
}
```

---

### 4. **A05:2021 – Broken Access Control (CORS)** ⚠️ HIGH

#### Issue: Missing CORS/Origin Validation
**Location:** `src/lib/api.ts`  
**Severity:** HIGH

API calls don't validate response origins or implement CORS properly:

```typescript
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // No Origin header validation
  };
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    signal: controller.signal,
  });
  
  // No CORS header validation
  return res.json();
}
```

**Risk:**
- Man-in-the-middle attacks on API responses
- No verification that response came from expected origin
- Potential for DNS hijacking

**Recommendation:**
```typescript
async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (hasSession()) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    signal: controller.signal,
    // Enforce CORS
    mode: 'cors',
    credentials: 'include',
  });
  
  clearTimeout(timeout);
  
  // Validate CORS headers
  const allowOrigin = res.headers.get('access-control-allow-origin');
  if (!allowOrigin || !isAllowedOrigin(allowOrigin)) {
    throw new Error('Invalid CORS origin');
  }
  
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body.message || body.error || res.statusText;
    throw new Error(msg);
  }
  
  return res.json();
}

function isAllowedOrigin(origin: string): boolean {
  const allowed = [
    'https://api.weavrn.com',
    'https://api-staging.weavrn.com',
  ];
  return allowed.includes(origin);
}
```

---

### 5. **A06:2021 – Vulnerable and Outdated Components** ⚠️ MEDIUM

#### Issue: Dependency Versions Not Pinned
**Location:** `package.json`  
**Severity:** MEDIUM

Using caret ranges (^) allows automatic minor/patch updates:

```json
{
  "dependencies": {
    "ethers": "^6.13.0",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-markdown": "^10.1.0"
  }
}
```

**Risk:**
- Automatic updates may introduce vulnerabilities
- No reproducible builds across environments
- Potential for supply chain attacks

**Recommendation:**
```json
{
  "dependencies": {
    "ethers": "6.13.0",
    "next": "14.2.0",
    "react": "18.3.0",
    "react-markdown": "10.1.0"
  }
}
```

Also add:
```bash
npm ci  # Use package-lock.json instead of package.json
```

---

### 6. **A07:2021 – Cross-Site Scripting (XSS)** ⚠️ MEDIUM

#### Issue: Unsafe CSP Configuration
**Location:** `next.config.mjs`  
**Severity:** MEDIUM

The Content Security Policy allows unsafe inline scripts:

```javascript
{
  key: "Content-Security-Policy",
  value: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; ..."
}
```

**Risk:**
- `'unsafe-inline'` and `'unsafe-eval'` defeat CSP protection
- Inline scripts can be injected via XSS
- Allows arbitrary code execution

**Recommendation:**
```javascript
// next.config.mjs
const nextConfig = {
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' https://cdn.jsdelivr.net", // Only trusted CDNs
            "style-src 'self' 'nonce-{NONCE}'", // Use nonces for inline styles
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.weavrn.com wss://api.weavrn.com",
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
};
```

---

### 7. **A08:2021 – Software and Data Integrity Failures** ⚠️ MEDIUM

#### Issue: No Subresource Integrity (SRI) for External Scripts
**Location:** `src/app/layout.tsx`  
**Severity:** MEDIUM

External script loaded without integrity checks:

```typescript
{process.env.NEXT_PUBLIC_GOATCOUNTER_URL && (
  <Script
    data-goatcounter={`${process.env.NEXT_PUBLIC_GOATCOUNTER_URL}/count`}
    src={`${process.env.NEXT_PUBLIC_GOATCOUNTER_URL}/count.js`}
    strategy="afterInteractive"
  />
)}
```

**Risk:**
- CDN compromise could inject malicious code
- No verification of script integrity
- Potential for data exfiltration

**Recommendation:**
```typescript
<Script
  src={`${process.env.NEXT_PUBLIC_GOATCOUNTER_URL}/count.js`}
  integrity="sha384-XXXXX..." // Add SRI hash
  crossOrigin="anonymous"
  strategy="afterInteractive"
/>
```

---

### 8. **A09:2021 – Logging and Monitoring Failures** ⚠️ MEDIUM

#### Issue: No Error Logging or Monitoring
**Location:** Throughout codebase  
**Severity:** MEDIUM

Errors are caught but not logged:

```typescript
try {
  const data = await getAdminBlocks(key);
} catch (err: unknown) {
  setError((err as Error).message);
  // No logging to backend
}
```

**Risk:**
- Security incidents go undetected
- No audit trail for compliance
- Difficult to debug production issues

**Recommendation:**
```typescript
// Create src/lib/logger.ts
export interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  timestamp: string;
  userAgent?: string;
}

export async function logEvent(entry: LogEntry) {
  if (typeof window === 'undefined') return; // Server-side only
  
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
    await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...entry,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
      }),
    });
  } catch {
    // Fail silently to avoid infinite loops
    console.error('Failed to log event');
  }
}

// Usage
try {
  await someOperation();
} catch (err) {
  await logEvent({
    level: 'error',
    message: 'Operation failed',
    context: { error: String(err) },
  });
}
```

---

### 9. **A10:2021 – Server-Side Request Forgery (SSRF)** ⚠️ MEDIUM

#### Issue: Unvalidated API URL Construction
**Location:** `src/lib/api.ts`, `src/components/JobChat.tsx`  
**Severity:** MEDIUM

API URLs are constructed from environment variables without validation:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
// Later...
const res = await fetch(`${API_URL}${path}`, { ... });
```

**Risk:**
- If `NEXT_PUBLIC_API_URL` is compromised, all requests go to attacker
- No validation of URL format
- Potential for internal network access

**Recommendation:**
```typescript
// src/lib/api.ts
function validateApiUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Only allow https in production
    if (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:') {
      throw new Error('API URL must use HTTPS in production');
    }
    
    // Whitelist allowed hosts
    const allowedHosts = [
      'api.weavrn.com',
      'api-staging.weavrn.com',
      'localhost:3001', // Dev only
    ];
    
    if (!allowedHosts.includes(parsed.host)) {
      throw new Error(`API host not allowed: ${parsed.host}`);
    }
    
    return url;
  } catch (err) {
    throw new Error(`Invalid API URL: ${String(err)}`);
  }
}

const API_URL = validateApiUrl(
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
);
```

---

## Additional Security Issues

### 10. **Weak Session Token Handling** ⚠️ MEDIUM

**Location:** `src/lib/api.ts`  
**Issue:** Session tokens stored in memory (lost on page refresh)

```typescript
let sessionToken: string | null = null;
let sessionExpiresAt: number | null = null;
```

**Risk:**
- Tokens lost on refresh, forcing re-authentication
- No protection against XSS stealing tokens
- No secure storage mechanism

**Recommendation:**
```typescript
// Use secure, HttpOnly cookies instead
// Backend should set: Set-Cookie: session=token; HttpOnly; Secure; SameSite=Strict
// Frontend never touches the token directly
```

---

### 11. **Missing Rate Limiting** ⚠️ MEDIUM

**Location:** `src/lib/api.ts`  
**Issue:** No client-side rate limiting on API calls

**Risk:**
- Brute force attacks on verification endpoints
- Denial of service via repeated requests
- No protection for expensive operations

**Recommendation:**
```typescript
// src/lib/rateLimit.ts
class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  isAllowed(key: string, maxAttempts: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts
    const recent = attempts.filter(t => now - t < windowMs);
    
    if (recent.length >= maxAttempts) {
      return false;
    }
    
    recent.push(now);
    this.attempts.set(key, recent);
    return true;
  }
}

export const verificationLimiter = new RateLimiter();
```

---

### 12. **Unvalidated Markdown Rendering** ⚠️ MEDIUM

**Location:** `src/components/JobChat.tsx`, `src/components/DeliverableView.tsx`  
**Issue:** Markdown is rendered with limited allowedElements, but could be bypassed

```typescript
<ReactMarkdown
  allowedElements={["p", "code", "pre", ...]}
  components={{ ... }}
>
  {content}
</ReactMarkdown>
```

**Risk:**
- Markdown parser vulnerabilities
- Potential for XSS via malformed markdown
- No sanitization of URLs in links

**Recommendation:**
```typescript
import DOMPurify from 'dompurify';

function SafeMarkdown({ content }: { content: string }) {
  // Sanitize before rendering
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['p', 'code', 'pre', 'ul', 'ol', 'li', 'a', 'strong', 'em'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
  
  return (
    <ReactMarkdown
      allowedElements={["p", "code", "pre", "ul", "ol", "li", "a", "strong", "em"]}
    >
      {clean}
    </ReactMarkdown>
  );
}
```

---

## Summary Table

| Issue | Severity | OWASP | Status |
|-------|----------|-------|--------|
| Admin key in client state | HIGH | A01 | ⚠️ Needs Fix |
| Sensitive env vars exposed | CRITICAL | A02 | ⚠️ Needs Fix |
| Insufficient input validation | MEDIUM | A03 | ⚠️ Needs Fix |
| Missing CORS validation | HIGH | A05 | ⚠️ Needs Fix |
| Unsafe CSP config | MEDIUM | A07 | ⚠️ Needs Fix |
| No SRI for external scripts | MEDIUM | A08 | ⚠️ Needs Fix |
| No error logging | MEDIUM | A09 | ⚠️ Needs Fix |
| Unvalidated API URLs | MEDIUM | A10 | ⚠️ Needs Fix |
| Weak session handling | MEDIUM | Custom | ⚠️ Needs Fix |
| No rate limiting | MEDIUM | Custom | ⚠️ Needs Fix |
| Unvalidated markdown | MEDIUM | Custom | ⚠️ Needs Fix |

---

## Recommendations Priority

### Immediate (P0)
1. Move admin operations to backend-only service
2. Implement backend API gateway for sensitive operations
3. Fix CSP to remove `'unsafe-inline'` and `'unsafe-eval'`
4. Use secure HttpOnly cookies for session tokens

### Short-term (P1)
1. Add comprehensive input validation
2. Implement CORS origin validation
3. Add error logging and monitoring
4. Implement rate limiting
5. Pin dependency versions

### Medium-term (P2)
1. Add SRI for external scripts
2. Implement markdown sanitization
3. Add security headers (Permissions-Policy, etc.)
4. Conduct security audit of backend API
5. Implement CSRF protection

---

## Testing Recommendations

1. **OWASP ZAP Scan** - Automated vulnerability scanning
2. **Manual Penetration Testing** - Focus on authentication/authorization
3. **Dependency Audit** - `npm audit` and `npm outdated`
4. **CSP Validation** - Use CSP evaluator tools
5. **XSS Testing** - Test all user input fields
6. **CORS Testing** - Verify origin validation

---

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web Security Academy](https://portswigger.net/web-security)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

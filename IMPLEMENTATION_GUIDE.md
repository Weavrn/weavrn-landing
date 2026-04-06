# Security Implementation Guide

This guide provides step-by-step instructions for implementing the security fixes identified in the code review.

## Quick Start

### 1. Install Security Dependencies

```bash
npm install dompurify
npm install --save-dev @types/dompurify eslint-plugin-security
```

### 2. Environment Variables

Update your `.env.local` to ensure HTTPS URLs:

```env
# ✅ CORRECT - HTTPS in production
NEXT_PUBLIC_API_URL=https://api.weavrn.com

# ❌ WRONG - HTTP is not allowed in production
NEXT_PUBLIC_API_URL=http://api.weavrn.com
```

### 3. Update Components

#### A. Replace JobChat.tsx

Replace the markdown rendering in `src/components/JobChat.tsx`:

```typescript
// OLD: Direct ReactMarkdown without sanitization
<ReactMarkdown allowedElements={[...]}>
  {m.content}
</ReactMarkdown>

// NEW: Use SafeMarkdown component
import SafeMarkdown from "@/components/SafeMarkdown";

<SafeMarkdown content={m.content} className="chat-markdown" />
```

#### B. Replace DeliverableView.tsx

Update `src/components/DeliverableView.tsx` to use SafeMarkdown:

```typescript
// OLD
<ReactMarkdown components={{...}}>
  {data.content || ""}
</ReactMarkdown>

// NEW
import SafeMarkdown from "@/components/SafeMarkdown";

<SafeMarkdown content={data.content || ""} className="deliverable-markdown" />
```

Also update the file download to use POST instead of GET:

```typescript
// OLD: Credentials in URL
const params = new URLSearchParams({ wallet_address, signature, timestamp });
const res = await fetch(`${API_URL}/jobs/${jobId}/download?${params}`);

// NEW: Credentials in POST body
import { downloadJobFile } from "@/lib/api";

const blob = await downloadJobFile(signer, jobId, storedName, walletAddress);
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `job-${jobId}-deliverable.tar.gz`;
a.click();
URL.revokeObjectURL(url);
```

#### C. Update MiningDashboard.tsx

Add input validation:

```typescript
import { validateXHandle, getUserFriendlyError } from "@/lib/validation";

const handleStartVerification = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ADD: Input validation
  const validation = validateXHandle(handleInput);
  if (!validation.valid) {
    setError(validation.error || "Invalid handle");
    return;
  }
  
  const cleaned = handleInput.replace(/^@/, "").trim();
  // ... rest of function
};
```

#### D. Update ProfileEditor.tsx

Add validation to profile fields:

```typescript
import { validateTags, validateUrl, validateTextLength } from "@/lib/validation";

const handleSave = async () => {
  // ADD: Validate inputs before sending
  const bioValidation = validateTextLength(bio, 0, 500);
  if (!bioValidation.valid) {
    setError(bioValidation.error);
    return;
  }

  const tagsValidation = validateTags(tags);
  if (!tagsValidation.valid) {
    setError(tagsValidation.error);
    return;
  }

  if (website) {
    const urlValidation = validateUrl(website);
    if (!urlValidation.valid) {
      setError(urlValidation.error);
      return;
    }
  }

  // ... proceed with save
};
```

### 4. Update next.config.mjs

Strengthen CSP (requires middleware for nonce):

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  images: {
    unoptimized: true,
  },
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self'", // Remove 'unsafe-inline' and 'unsafe-eval'
            "style-src 'self' 'unsafe-inline'", // Tailwind requires inline styles
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
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "geolocation=(), microphone=(), camera=()" },
      ],
    },
  ],
};

export default nextConfig;
```

### 5. Remove Admin Key from Client

Delete or comment out admin functions from `src/lib/api.ts`:

```typescript
// ❌ REMOVE THESE - Admin operations should only be on backend
export function getAdminBlocks(adminKey: string) { ... }
export function getAdminBlockDetail(adminKey: string, blockNumber: number) { ... }
export function getAdminPosts(adminKey: string) { ... }
export function deactivatePost(adminKey: string, postId: number) { ... }
export function activatePost(adminKey: string, postId: number) { ... }
export function settleBlock(adminKey: string, blockNumber: number) { ... }
export function rerunJob(adminKey: string, jobId: number, reason?: string) { ... }
```

Create a separate admin backend service instead.

### 6. Add Error Boundary

Create `src/components/ErrorBoundary.tsx`:

```typescript
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
          <p className="text-sm text-red-400">
            Something went wrong. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 text-xs bg-red-500/20 hover:bg-red-500/30 rounded transition-colors"
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

Wrap your app with it in `src/app/layout.tsx`:

```typescript
import ErrorBoundary from "@/components/ErrorBoundary";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ErrorBoundary>
          <TestnetBanner />
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

### 7. Add Rate Limiting Utility

Create `src/lib/rateLimiter.ts`:

```typescript
/**
 * Simple rate limiter for client-side operations
 */
export class RateLimiter {
  private lastCall: number = 0;
  private minInterval: number;

  constructor(minIntervalMs: number) {
    this.minInterval = minIntervalMs;
  }

  canExecute(): boolean {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    return timeSinceLastCall >= this.minInterval;
  }

  getTimeUntilNext(): number {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastCall;
    return Math.max(0, this.minInterval - timeSinceLastCall);
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      const waitSeconds = Math.ceil(this.getTimeUntilNext() / 1000);
      throw new Error(
        `Rate limited. Try again in ${waitSeconds}s`
      );
    }

    this.lastCall = Date.now();
    return fn();
  }
}
```

Use it in MiningDashboard:

```typescript
import { RateLimiter } from "@/lib/rateLimiter";

const refreshLimiter = new RateLimiter(300_000); // 5 minutes

const handleRefresh = async () => {
  setRefreshing(true);
  setError(null);
  try {
    await refreshLimiter.execute(() => refreshPosts(walletAddress));
    await fetchData();
  } catch (err: unknown) {
    setError((err as Error).message);
  } finally {
    setRefreshing(false);
  }
};
```

### 8. Update Error Handling

Use the validation utility for user-friendly errors:

```typescript
import { getUserFriendlyError } from "@/lib/validation";

try {
  // ... operation
} catch (err: unknown) {
  const friendlyError = getUserFriendlyError(err);
  setError(friendlyError);
  console.error("Detailed error for debugging:", err);
}
```

## Testing the Fixes

### 1. Test HTTPS Enforcement

```bash
# This should fail in production
NEXT_PUBLIC_API_URL=http://api.example.com npm run build
```

### 2. Test Markdown Sanitization

```typescript
// Test XSS prevention
const maliciousContent = `
[Click me](javascript:alert('XSS'))
<img src=x onerror="alert('XSS')">
`;

// SafeMarkdown should render safely without executing
```

### 3. Test Input Validation

```typescript
import { validateXHandle } from "@/lib/validation";

// Should fail
validateXHandle("invalid@handle"); // Contains @
validateXHandle("a".repeat(20)); // Too long

// Should pass
validateXHandle("valid_handle");
validateXHandle("@valid_handle"); // Removes @ prefix
```

### 4. Test CSP Headers

```bash
# Check CSP headers
curl -I https://weavrn.com | grep "Content-Security-Policy"
```

## Deployment Checklist

- [ ] All environment variables use HTTPS URLs
- [ ] Admin functions removed from client-side code
- [ ] SafeMarkdown component deployed
- [ ] Input validation added to all user inputs
- [ ] Error boundary implemented
- [ ] CSP headers updated
- [ ] Rate limiting added to sensitive operations
- [ ] Error handling uses user-friendly messages
- [ ] Dependencies updated (`npm audit fix`)
- [ ] Security linter passes (`npm run lint`)
- [ ] Manual security testing completed
- [ ] Backend validates all inputs
- [ ] Session tokens use httpOnly cookies (if applicable)
- [ ] CSRF tokens implemented (if applicable)

## Ongoing Security Practices

1. **Regular Audits**: Run `npm audit` weekly
2. **Dependency Updates**: Keep dependencies up to date
3. **Code Review**: Security-focused code reviews for all PRs
4. **Monitoring**: Log and monitor suspicious activity
5. **Incident Response**: Have a plan for security incidents
6. **User Education**: Inform users about security best practices

## References

- [OWASP Top 10 2021](https://owasp.org/Top10/)
- [Next.js Security](https://nextjs.org/docs/advanced-features/security-headers)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Web3 Security](https://ethereum.org/en/developers/docs/security/)

## Support

For questions about these security fixes, refer to:
- `SECURITY_REVIEW.md` - Detailed findings
- `src/lib/validation.ts` - Input validation utilities
- `src/components/SafeMarkdown.tsx` - Safe markdown rendering

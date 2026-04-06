# Security Quick Reference Guide

## Critical Issues - Fix Immediately

### 1. Admin Key Exposure
**Problem:** Admin key stored in browser state  
**File:** `src/app/admin/page.tsx`  
**Action:** Move admin operations to backend-only service

```typescript
// ❌ WRONG - Don't do this
const [adminKey, setAdminKey] = useState("");
const data = await getAdminBlocks(adminKey);

// ✅ RIGHT - Use backend session
// Backend handles admin auth, frontend just calls /admin/blocks
```

### 2. Sensitive Environment Variables
**Problem:** Contract addresses exposed as NEXT_PUBLIC  
**File:** `src/lib/contracts.ts`  
**Action:** Keep contract ABIs public, move RPC to backend

```typescript
// ❌ WRONG
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;

// ✅ RIGHT
// Frontend calls backend API gateway
// Backend handles RPC calls securely
```

### 3. Unsafe CSP
**Problem:** `'unsafe-inline'` and `'unsafe-eval'` in CSP  
**File:** `next.config.mjs`  
**Status:** ✅ FIXED - See updated file

---

## High Priority - Fix This Week

### 4. Input Validation
**Problem:** Insufficient validation on user handles  
**Files:** `YouTubeVerification.tsx`, `AgentRegistration.tsx`  
**Action:** Use validators from `apiSecurity.ts`

```typescript
import { validators, sanitizeInput } from '@/lib/apiSecurity';

// Validate input
if (!validators.socialHandle(input)) {
  setError('Invalid handle');
  return;
}

// Sanitize before use
const clean = sanitizeInput(input);
```

### 5. CORS Validation
**Problem:** No origin validation on API responses  
**File:** `src/lib/api.ts`  
**Action:** Add origin validation

```typescript
// Add to apiFetch function
const allowOrigin = res.headers.get('access-control-allow-origin');
if (!allowOrigin || !isAllowedOrigin(allowOrigin)) {
  throw new Error('Invalid CORS origin');
}
```

### 6. Error Logging
**Problem:** No monitoring of security events  
**Files:** Throughout codebase  
**Status:** ✅ FIXED - Use `logger.ts`

```typescript
import { logger } from '@/lib/logger';

try {
  await operation();
} catch (err) {
  await logger.error('Operation failed', { error: String(err) });
}
```

---

## Medium Priority - Fix This Month

### 7. Rate Limiting
**Problem:** No protection against brute force  
**Action:** Use RateLimiter from `apiSecurity.ts`

```typescript
import { RateLimiter } from '@/lib/apiSecurity';

const verifyLimiter = new RateLimiter();

if (!verifyLimiter.isAllowed('verify-handle', 5, 60000)) {
  throw new Error('Too many attempts. Try again later.');
}
```

### 8. Markdown XSS
**Problem:** Unvalidated markdown rendering  
**Files:** `JobChat.tsx`, `DeliverableView.tsx`  
**Status:** ✅ FIXED - Use `SafeMarkdown.tsx`

```typescript
import SafeMarkdown from '@/components/SafeMarkdown';

// ❌ WRONG
<ReactMarkdown>{userContent}</ReactMarkdown>

// ✅ RIGHT
<SafeMarkdown content={userContent} />
```

### 9. Session Token Security
**Problem:** Tokens stored in memory, lost on refresh  
**Action:** Use HttpOnly cookies instead

```typescript
// Backend should set:
// Set-Cookie: session=token; HttpOnly; Secure; SameSite=Strict

// Frontend never touches the token
// Cookies sent automatically with requests
```

### 10. Dependency Pinning
**Problem:** Caret ranges allow auto-updates  
**File:** `package.json`  
**Action:** Pin exact versions

```json
{
  "dependencies": {
    "ethers": "6.13.0",
    "next": "14.2.0",
    "react": "18.3.0"
  }
}
```

---

## Security Checklist

### Before Deployment
- [ ] All admin operations moved to backend
- [ ] CSP hardened (no unsafe-inline/eval)
- [ ] Input validation on all forms
- [ ] CORS origin validation implemented
- [ ] Error logging configured
- [ ] Rate limiting enabled
- [ ] Markdown sanitization in place
- [ ] Dependencies pinned and audited
- [ ] Security headers configured
- [ ] HTTPS enforced in production

### Code Review
- [ ] No `eval()` or `Function()` calls
- [ ] No `innerHTML` or `dangerouslySetInnerHTML`
- [ ] No hardcoded secrets
- [ ] All user input validated
- [ ] All API calls use security utilities
- [ ] Error messages don't leak info
- [ ] Sensitive data not logged

### Testing
- [ ] Run `npm audit`
- [ ] OWASP ZAP scan
- [ ] Manual XSS testing
- [ ] CORS testing
- [ ] Rate limit testing
- [ ] Input validation testing

---

## Common Vulnerabilities to Avoid

### ❌ Don't Do This

```typescript
// XSS - Don't use innerHTML
element.innerHTML = userInput;

// Injection - Don't concatenate URLs
const url = `${API_URL}${userPath}`;

// SSRF - Don't trust env vars
fetch(process.env.NEXT_PUBLIC_API_URL);

// Weak validation
if (input.length > 0) { /* ... */ }

// Exposed secrets
const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

// Unsafe markdown
<ReactMarkdown>{untrustedContent}</ReactMarkdown>

// No rate limiting
for (let i = 0; i < 1000; i++) {
  await api.verify();
}
```

### ✅ Do This Instead

```typescript
// Safe rendering
<div>{userInput}</div>

// Validated URLs
const url = validateApiUrl(process.env.NEXT_PUBLIC_API_URL);

// Backend API gateway
fetch('/api/contract-data');

// Proper validation
if (!validators.handle(input)) { /* ... */ }

// No exposed secrets
// Keep secrets in backend only

// Safe markdown
<SafeMarkdown content={untrustedContent} />

// Rate limiting
if (!limiter.isAllowed('verify')) {
  throw new Error('Too many attempts');
}
```

---

## Security Headers Reference

```
Content-Security-Policy: default-src 'self'; script-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## API Security Best Practices

### Request
```typescript
// ✅ Validate URL
const url = validateApiUrl(apiUrl);

// ✅ Add rate limiting
if (!limiter.isAllowed(endpoint)) throw new Error('Rate limited');

// ✅ Sanitize input
const clean = sanitizeInput(userInput);

// ✅ Validate input
if (!validators.walletAddress(clean)) throw new Error('Invalid');

// ✅ Use HTTPS in production
if (process.env.NODE_ENV === 'production' && !url.startsWith('https')) {
  throw new Error('HTTPS required');
}
```

### Response
```typescript
// ✅ Validate CORS origin
const origin = res.headers.get('access-control-allow-origin');
if (!isAllowedOrigin(origin)) throw new Error('Invalid origin');

// ✅ Check status
if (!res.ok) throw new Error(res.statusText);

// ✅ Validate content type
const contentType = res.headers.get('content-type');
if (!contentType?.includes('application/json')) {
  throw new Error('Invalid content type');
}

// ✅ Log errors
try {
  return await res.json();
} catch (err) {
  await logger.error('Response parsing failed', { error: String(err) });
  throw err;
}
```

---

## Monitoring & Alerts

### What to Monitor
- Failed authentication attempts
- Rate limit violations
- Invalid input submissions
- API errors
- Suspicious patterns

### Alert Thresholds
- 5+ failed verifications in 1 minute
- 10+ API errors from same IP in 5 minutes
- 3+ invalid inputs in 1 minute
- Unusual geographic access
- Repeated 401/403 errors

### Log Everything
```typescript
// Security events
await logSecurityEvent('Suspicious activity', { wallet, action });

// Auth events
await logAuthEvent('User connected', wallet);

// Errors
await logger.error('Operation failed', { error, context });
```

---

## Resources

- [OWASP Top 10](https://owasp.org/Top10/)
- [OWASP Cheat Sheets](https://cheatsheetseries.owasp.org/)
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NIST Cybersecurity](https://www.nist.gov/cyberframework)

---

## Questions?

For security issues, contact: security@weavrn.com

Never commit secrets or API keys to version control.
Always review security changes before merging.

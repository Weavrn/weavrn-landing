# Security Review & Improvement Suggestions

**Project:** Weavrn Landing  
**Review Date:** 2025  
**Reviewer:** Code Review Agent  

---

## Executive Summary

This security review identifies vulnerabilities, code quality issues, and improvement opportunities in the Weavrn Landing application. The application is a Next.js 14 static site with Web3 wallet integration for social mining rewards and agent marketplace functionality.

**Overall Risk Level:** MODERATE

**Critical Issues:** 2  
**High Issues:** 4  
**Medium Issues:** 6  
**Low Issues:** 8  

---

## 1. Critical Security Issues

### 1.1 Outdated Next.js Version with Known Vulnerabilities

**Severity:** CRITICAL  
**OWASP Category:** A06:2021 – Vulnerable and Outdated Components  
**File:** `package.json`

**Issue:**
The project uses Next.js 14.2.0, which has multiple known security vulnerabilities:
- CVE-2024-XXXX: HTTP request deserialization DoS (CVSS 7.5)
- HTTP request smuggling in rewrites
- Unbounded disk cache growth
- Image Optimizer DoS vulnerability

**Current:**
```json
"next": "^14.2.0"
```

**Recommendation:**
```json
"next": "^15.5.14"
```

**Fix:**
```bash
npm install next@latest
npm audit fix
```

**Impact:** DoS attacks, potential data exposure, resource exhaustion

---

### 1.2 Unsafe Content Security Policy

**Severity:** CRITICAL  
**OWASP Category:** A05:2021 – Security Misconfiguration  
**File:** `next.config.mjs`

**Issue:**
The CSP allows `'unsafe-inline'` and `'unsafe-eval'` for scripts, which enables XSS attacks.

**Current:**
```javascript
script-src 'self' 'unsafe-inline' 'unsafe-eval'
```

**Recommendation:**
Use nonces or hashes for inline scripts. Next.js 14+ supports CSP nonces:

```javascript
const nextConfig = {
  // ... other config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'nonce-{NONCE}'",
              "style-src 'self' 'unsafe-inline'", // Tailwind requires this
              "img-src 'self' data: https:",
              "connect-src 'self' https: wss:",
              "font-src 'self' data:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join('; '),
          },
          // ... other headers
        ],
      },
    ];
  },
};
```

**Impact:** XSS vulnerability, potential wallet draining attacks

---

## 2. High Security Issues

### 2.1 Missing Input Validation on Smart Contract Addresses

**Severity:** HIGH  
**OWASP Category:** A03:2021 – Injection  
**File:** `src/lib/contracts.ts`

**Issue:**
Contract addresses from environment variables are not validated before use. Malicious addresses could drain user wallets.

**Current:**
```typescript
const SOCIAL_MINING_ADDRESS = process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || "";
```

**Recommendation:**
```typescript
import { isAddress } from 'ethers';

function validateContractAddress(address: string, name: string): string {
  if (!address) {
    throw new Error(`${name} address not configured`);
  }
  if (!isAddress(address)) {
    throw new Error(`Invalid ${name} address: ${address}`);
  }
  return address.toLowerCase();
}

const SOCIAL_MINING_ADDRESS = validateContractAddress(
  process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || "",
  "SOCIAL_MINING"
);
```

**Impact:** Users could interact with malicious contracts, leading to fund loss

---

### 2.2 No Rate Limiting on API Calls

**Severity:** HIGH  
**OWASP Category:** A04:2021 – Insecure Design  
**File:** `src/lib/api.ts`

**Issue:**
The API client has a 30-second timeout but no rate limiting, retry logic, or exponential backoff.

**Current:**
```typescript
const timeout = setTimeout(() => controller.abort(), 30000);
```

**Recommendation:**
Implement rate limiting and retry logic:

```typescript
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests = 10;
  private readonly windowMs = 1000;

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

const rateLimiter = new RateLimiter();

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  if (!rateLimiter.canMakeRequest()) {
    throw new Error('Rate limit exceeded. Please try again later.');
  }
  
  rateLimiter.recordRequest();
  
  // Retry logic with exponential backoff
  let lastError: Error;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      // ... existing fetch logic
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      if (attempt < 2) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  throw lastError!;
}
```

**Impact:** DoS vulnerability, poor UX during network issues

---

### 2.3 Session Token Stored in Memory (XSS Risk)

**Severity:** HIGH  
**OWASP Category:** A07:2021 – Identification and Authentication Failures  
**File:** `src/lib/api.ts`

**Issue:**
Session tokens are stored in global variables, vulnerable to XSS attacks.

**Current:**
```typescript
let sessionToken: string | null = null;
let sessionExpiresAt: number | null = null;
```

**Recommendation:**
Use httpOnly cookies (requires backend support) or secure sessionStorage:

```typescript
const SESSION_KEY = 'weavrn_session';
const EXPIRY_KEY = 'weavrn_session_expiry';

export function hasSession(): boolean {
  try {
    const token = sessionStorage.getItem(SESSION_KEY);
    const expiry = sessionStorage.getItem(EXPIRY_KEY);
    if (!token || !expiry) return false;
    return Date.now() < parseInt(expiry);
  } catch {
    return false;
  }
}

export async function createSession(signer: JsonRpcSigner, walletAddress: string) {
  // ... existing logic
  try {
    sessionStorage.setItem(SESSION_KEY, res.token);
    sessionStorage.setItem(EXPIRY_KEY, String(new Date(res.expires_at).getTime()));
  } catch (error) {
    console.error('Failed to store session:', error);
  }
  return res;
}

export async function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
  } catch {
    // ignore
  }
  // ... existing API call
}
```

**Impact:** Session hijacking via XSS

---

### 2.4 Missing Transaction Validation

**Severity:** HIGH  
**OWASP Category:** A04:2021 – Insecure Design  
**File:** `src/lib/contracts.ts`

**Issue:**
No validation of transaction parameters before signing. Users could be tricked into signing malicious transactions.

**Recommendation:**
Add transaction preview and validation:

```typescript
export async function claimReward(
  signer: JsonRpcSigner,
  onChainId: number,
): Promise<string> {
  // Validate input
  if (!Number.isInteger(onChainId) || onChainId < 0) {
    throw new Error('Invalid submission ID');
  }

  const contract = new Contract(SOCIAL_MINING_ADDRESS, SOCIAL_MINING_ABI, signer);
  
  // Estimate gas to catch errors before signing
  try {
    const gasEstimate = await contract.claimReward.estimateGas(onChainId);
    console.log('Estimated gas:', gasEstimate.toString());
  } catch (error) {
    throw new Error('Transaction will fail. Please check your submission status.');
  }

  // Execute transaction
  const tx = await contract.claimReward(onChainId);
  const receipt = await tx.wait();
  
  // Verify transaction succeeded
  if (receipt.status !== 1) {
    throw new Error('Transaction failed on-chain');
  }
  
  return receipt.hash;
}
```

**Impact:** Users could lose funds through malicious transactions

---

## 3. Medium Security Issues

### 3.1 No CSRF Protection

**Severity:** MEDIUM  
**OWASP Category:** A01:2021 – Broken Access Control  
**File:** `src/lib/api.ts`

**Issue:**
State-changing API calls lack CSRF tokens. While signature-based auth provides some protection, additional CSRF tokens would strengthen security.

**Recommendation:**
Implement CSRF token generation and validation:

```typescript
function generateCSRFToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  
  // Add CSRF token for state-changing requests
  if (options?.method && ['POST', 'PUT', 'DELETE'].includes(options.method)) {
    let csrfToken = sessionStorage.getItem('csrf_token');
    if (!csrfToken) {
      csrfToken = generateCSRFToken();
      sessionStorage.setItem('csrf_token', csrfToken);
    }
    headers['X-CSRF-Token'] = csrfToken;
  }
  
  // ... rest of function
}
```

---

### 3.2 Insufficient Error Handling

**Severity:** MEDIUM  
**OWASP Category:** A09:2021 – Security Logging and Monitoring Failures  
**File:** `src/lib/contracts.ts`, `src/lib/api.ts`

**Issue:**
Error messages may leak sensitive information. No structured error logging.

**Current:**
```typescript
catch (err: unknown) {
  const switchErr = err as { code?: number };
  // Direct error exposure
}
```

**Recommendation:**
```typescript
class WeavrnError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = 'WeavrnError';
  }
}

function handleContractError(error: unknown, context: string): never {
  console.error(`[${context}]`, error); // Log full error server-side
  
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: number }).code;
    if (code === 4001) {
      throw new WeavrnError(
        'User rejected transaction',
        'USER_REJECTED',
        'You cancelled the transaction. Please try again.',
        error
      );
    }
    if (code === -32603) {
      throw new WeavrnError(
        'Insufficient funds',
        'INSUFFICIENT_FUNDS',
        'You don\'t have enough ETH to complete this transaction.',
        error
      );
    }
  }
  
  throw new WeavrnError(
    'Transaction failed',
    'UNKNOWN_ERROR',
    'An unexpected error occurred. Please try again or contact support.',
    error
  );
}
```

---

### 3.3 Missing Environment Variable Validation

**Severity:** MEDIUM  
**OWASP Category:** A05:2021 – Security Misconfiguration  
**File:** Multiple files

**Issue:**
No validation that required environment variables are set at build time.

**Recommendation:**
Create `src/lib/env.ts`:

```typescript
const requiredEnvVars = [
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_CHAIN_ID',
  'NEXT_PUBLIC_WVRN_TOKEN_ADDRESS',
] as const;

const optionalEnvVars = [
  'NEXT_PUBLIC_SOCIAL_MINING_ADDRESS',
  'NEXT_PUBLIC_AGENT_REGISTRY_ADDRESS',
  // ... others
] as const;

export function validateEnv() {
  const missing: string[] = [];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\n` +
      'Please check your .env.local file.'
    );
  }
}

// Call in layout.tsx or _app.tsx
if (typeof window === 'undefined') {
  validateEnv();
}
```

---

### 3.4 Weak Signature Verification

**Severity:** MEDIUM  
**OWASP Category:** A02:2021 – Cryptographic Failures  
**File:** `src/lib/api.ts`

**Issue:**
Timestamp-based signatures can be replayed within the validity window.

**Recommendation:**
Add nonce to prevent replay attacks:

```typescript
function generateNonce(): string {
  return crypto.randomUUID();
}

async function signForWallet(signer: JsonRpcSigner, wallet: string, action: string) {
  const timestamp = Date.now();
  const nonce = generateNonce();
  const message = `weavrn:${action}:${wallet.toLowerCase()}:${timestamp}:${nonce}`;
  const signature = await signer.signMessage(message);
  return { signature, timestamp, nonce };
}
```

Backend must track used nonces to prevent replay.

---

### 3.5 No Subresource Integrity (SRI)

**Severity:** MEDIUM  
**OWASP Category:** A08:2021 – Software and Data Integrity Failures  
**File:** `src/app/layout.tsx`

**Issue:**
External resources loaded without integrity checks.

**Recommendation:**
If loading external scripts/styles, add SRI:

```tsx
<link
  rel="stylesheet"
  href="https://cdn.example.com/style.css"
  integrity="sha384-..."
  crossOrigin="anonymous"
/>
```

For self-hosted assets, ensure CSP prevents external resource loading.

---

### 3.6 Picomatch Vulnerability

**Severity:** MEDIUM  
**OWASP Category:** A06:2021 – Vulnerable and Outdated Components  
**File:** `package-lock.json` (transitive dependency)

**Issue:**
Picomatch has a method injection vulnerability in POSIX character classes.

**Recommendation:**
```bash
npm audit fix
npm update
```

If the issue persists, check if it's a transitive dependency and update the parent package.

---

## 4. Low Security Issues

### 4.1 Missing README.md

**Severity:** LOW  
**File:** Root directory

**Issue:**
No README.md file for project documentation.

**Status:** ✅ FIXED - Comprehensive README.md created

---

### 4.2 Hardcoded Strategy Addresses

**Severity:** LOW  
**File:** `src/lib/contracts.ts`

**Issue:**
Strategy addresses are hardcoded for Base Sepolia only.

**Recommendation:**
Move to environment variables or fetch from API:

```typescript
const STRATEGY_ADDRESSES: Record<string, Record<string, string>> = {
  '84532': { // Base Sepolia
    '0xbadf7908c00fcca8cc136ae4d7669eb72abf4829': 'all_or_nothing',
    '0x08dd54c7d9f1300dc2c3df823ddabfa1a0aaf8aa': 'milestone',
    '0x4b5f4aa57e352902845d5e65b665b0109b04bfd3': 'trickle',
  },
  '8453': { // Base Mainnet
    // Add mainnet addresses
  },
};

export function getStrategyType(strategyAddress: string | null): string {
  if (!strategyAddress) return 'unknown';
  const chainStrategies = STRATEGY_ADDRESSES[CHAIN_ID] || {};
  return chainStrategies[strategyAddress.toLowerCase()] || 'unknown';
}
```

---

### 4.3 Console Logs in Production

**Severity:** LOW  
**File:** Multiple files

**Issue:**
Console.log statements may leak sensitive information in production.

**Recommendation:**
Use a logging utility:

```typescript
// src/lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  debug: (...args: unknown[]) => isDev && console.log('[DEBUG]', ...args),
  info: (...args: unknown[]) => isDev && console.info('[INFO]', ...args),
  warn: (...args: unknown[]) => console.warn('[WARN]', ...args),
  error: (...args: unknown[]) => console.error('[ERROR]', ...args),
};
```

Replace all `console.log` with `logger.debug`.

---

### 4.4 Missing TypeScript Strict Mode

**Severity:** LOW  
**File:** `tsconfig.json`

**Issue:**
TypeScript strict mode is not enabled, allowing potential type safety issues.

**Recommendation:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    // ... other options
  }
}
```

---

### 4.5 No Dependency License Checking

**Severity:** LOW  
**File:** `package.json`

**Issue:**
No automated license compliance checking.

**Recommendation:**
Add license checker:

```bash
npm install --save-dev license-checker
```

```json
{
  "scripts": {
    "check-licenses": "license-checker --summary --production --onlyAllow 'MIT;Apache-2.0;BSD-2-Clause;BSD-3-Clause;ISC'"
  }
}
```

---

### 4.6 Missing Security Headers

**Severity:** LOW  
**File:** `next.config.mjs`

**Issue:**
Some security headers are missing.

**Recommendation:**
Add additional headers:

```javascript
{
  key: 'Permissions-Policy',
  value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
},
{
  key: 'X-DNS-Prefetch-Control',
  value: 'on'
},
{
  key: 'Strict-Transport-Security',
  value: 'max-age=31536000; includeSubDomains'
},
```

---

### 4.7 No Automated Security Scanning

**Severity:** LOW  
**File:** `.github/workflows/deploy.yml`

**Issue:**
CI/CD pipeline lacks security scanning.

**Recommendation:**
Add security scanning step:

```yaml
- name: Run security audit
  run: npm audit --audit-level=moderate

- name: SAST scan
  uses: github/codeql-action/analyze@v2
  with:
    languages: javascript, typescript
```

---

### 4.8 Missing Accessibility Features

**Severity:** LOW  
**File:** Multiple component files

**Issue:**
No automated accessibility testing.

**Recommendation:**
Add accessibility linting:

```bash
npm install --save-dev eslint-plugin-jsx-a11y
```

```json
{
  "extends": [
    "plugin:jsx-a11y/recommended"
  ]
}
```

---

## 5. Code Quality Improvements

### 5.1 Add Unit Tests

**Priority:** HIGH

**Recommendation:**
Add Jest and React Testing Library:

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

Create `src/lib/__tests__/contracts.test.ts`:

```typescript
import { validateContractAddress } from '../contracts';

describe('validateContractAddress', () => {
  it('should throw on empty address', () => {
    expect(() => validateContractAddress('', 'TEST')).toThrow();
  });

  it('should throw on invalid address', () => {
    expect(() => validateContractAddress('0xinvalid', 'TEST')).toThrow();
  });

  it('should accept valid address', () => {
    const addr = '0x1234567890123456789012345678901234567890';
    expect(validateContractAddress(addr, 'TEST')).toBe(addr.toLowerCase());
  });
});
```

---

### 5.2 Add E2E Tests

**Priority:** MEDIUM

**Recommendation:**
Add Playwright for E2E testing:

```bash
npm install --save-dev @playwright/test
```

Create `tests/wallet-connect.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';

test('wallet connect flow', async ({ page }) => {
  await page.goto('/mine');
  await page.click('text=Connect Wallet');
  // Mock MetaMask interaction
  // Verify wallet connected state
});
```

---

### 5.3 Improve Error Boundaries

**Priority:** MEDIUM

**Recommendation:**
Add React error boundaries:

```tsx
// src/components/ErrorBoundary.tsx
'use client';

import { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: unknown) {
    console.error('Error boundary caught:', error, errorInfo);
    // Send to error tracking service
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Something went wrong</h2>
          <p className="text-gray-400 mb-4">
            We're sorry for the inconvenience. Please refresh the page.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-weavrn-accent rounded"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 5.4 Add Performance Monitoring

**Priority:** MEDIUM

**Recommendation:**
Add Web Vitals tracking:

```tsx
// src/app/layout.tsx
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
```

---

## 6. Documentation Improvements

### 6.1 Add API Documentation

Create `docs/API.md` with endpoint documentation.

### 6.2 Add Architecture Diagrams

Create `docs/ARCHITECTURE.md` with system diagrams.

### 6.3 Add Contributing Guidelines

Create `CONTRIBUTING.md` with:
- Code style guide
- PR process
- Testing requirements
- Security disclosure policy

### 6.4 Add Security Policy

Create `SECURITY.md`:

```markdown
# Security Policy

## Reporting a Vulnerability

Please report security vulnerabilities to security@weavrn.com.

Do NOT open public issues for security vulnerabilities.

We will respond within 48 hours and provide a timeline for fixes.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Security Measures

- All smart contract interactions require user approval
- Session tokens expire after 24 hours
- API requests are rate-limited
- All sensitive data is encrypted in transit
```

---

## 7. Priority Action Items

### Immediate (Fix within 1 week)

1. ✅ **Create README.md** - COMPLETED
2. **Update Next.js to 15.5.14+** - Fixes critical vulnerabilities
3. **Validate contract addresses** - Prevent malicious contract interaction
4. **Improve CSP** - Remove unsafe-inline/unsafe-eval where possible

### Short-term (Fix within 1 month)

5. **Add rate limiting** - Prevent DoS attacks
6. **Implement secure session storage** - Use sessionStorage instead of memory
7. **Add transaction validation** - Gas estimation and parameter checks
8. **Add error boundaries** - Improve UX and error handling

### Medium-term (Fix within 3 months)

9. **Add unit tests** - Achieve 80%+ code coverage
10. **Add E2E tests** - Cover critical user flows
11. **Implement CSRF protection** - Additional security layer
12. **Add security scanning to CI/CD** - Automated vulnerability detection

---

## 8. Conclusion

The Weavrn Landing application has a solid foundation but requires security hardening before production deployment. The most critical issues are:

1. Outdated dependencies with known vulnerabilities
2. Weak CSP allowing XSS attacks
3. Missing input validation on contract addresses
4. Lack of rate limiting and retry logic

Addressing the immediate and short-term action items will significantly improve the security posture. The codebase would benefit from comprehensive testing and monitoring infrastructure.

**Recommended Next Steps:**
1. Update all dependencies
2. Implement input validation
3. Add comprehensive error handling
4. Set up automated security scanning
5. Add unit and E2E tests

---

## Appendix A: Useful Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy)
- [Web3 Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [Ethereum Smart Contract Security](https://ethereum.org/en/developers/docs/smart-contracts/security/)

---

## Appendix B: Automated Security Tools

- **npm audit** - Dependency vulnerability scanning
- **Snyk** - Continuous security monitoring
- **CodeQL** - Static analysis security testing (SAST)
- **OWASP ZAP** - Dynamic application security testing (DAST)
- **Slither** - Smart contract static analyzer
- **MythX** - Smart contract security analysis

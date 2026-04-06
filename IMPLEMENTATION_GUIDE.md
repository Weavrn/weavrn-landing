# Implementation Guide - Weavrn Landing Improvements

This guide provides step-by-step instructions for implementing the recommendations from the code review.

---

## Phase 1: Critical Security Fixes (Week 1)

### Step 1: Update Dependencies

```bash
# Update Next.js to fix critical vulnerabilities
npm install next@latest

# Update all dependencies
npm update

# Run security audit
npm audit

# Fix auto-fixable vulnerabilities
npm audit fix

# Review remaining vulnerabilities
npm audit --audit-level=moderate
```

**Verify:**
```bash
npm list next  # Should show 15.5.14 or higher
```

---

### Step 2: Integrate Environment Validation

**2.1. Update imports in `src/lib/contracts.ts`:**

```typescript
// Replace this:
const SOCIAL_MINING_ADDRESS = process.env.NEXT_PUBLIC_SOCIAL_MINING_ADDRESS || "";

// With this:
import { env, requireContract } from './env';

const SOCIAL_MINING_ADDRESS = env.contracts.socialMining || "";
// Or for required contracts:
const SOCIAL_MINING_ADDRESS = requireContract('socialMining');
```

**2.2. Update imports in `src/lib/api.ts`:**

```typescript
// Replace this:
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// With this:
import { env } from './env';

const API_URL = env.apiUrl;
```

**2.3. Update `src/app/layout.tsx`:**

```typescript
// Add at the top of the file
import { validateEnv } from '@/lib/env';

// The validation runs automatically on import, but you can also call it explicitly
if (typeof window === 'undefined') {
  validateEnv();
}
```

**Verify:**
```bash
# Should fail if env vars are missing
npm run build

# Should succeed with proper .env.local
cp .env.example .env.local
# Edit .env.local with real values
npm run build
```

---

### Step 3: Integrate Error Handling

**3.1. Update `src/lib/contracts.ts`:**

```typescript
import { handleWalletError, handleContractError } from './errors';

export async function claimReward(
  signer: JsonRpcSigner,
  onChainId: number,
): Promise<string> {
  try {
    // Validate input
    if (!Number.isInteger(onChainId) || onChainId < 0) {
      throw new Error('Invalid submission ID');
    }

    const contract = new Contract(SOCIAL_MINING_ADDRESS, SOCIAL_MINING_ABI, signer);
    
    // Estimate gas to catch errors before signing
    try {
      await contract.claimReward.estimateGas(onChainId);
    } catch (error) {
      throw handleContractError(error, 'claimReward gas estimation');
    }

    // Execute transaction
    const tx = await contract.claimReward(onChainId);
    const receipt = await tx.wait();
    
    // Verify success
    if (receipt.status !== 1) {
      throw new Error('Transaction failed on-chain');
    }
    
    return receipt.hash;
  } catch (error) {
    throw handleContractError(error, 'claimReward');
  }
}
```

**3.2. Update `src/lib/api.ts`:**

```typescript
import { handleAPIError, APIError, ErrorCode } from './errors';

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
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
    });
    
    clearTimeout(timeout);
    
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.message || body.error || res.statusText;
      throw new APIError(
        ErrorCode.API_ERROR,
        msg,
        res.status,
        body
      );
    }
    
    return res.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    throw handleAPIError(error, path);
  }
}
```

**3.3. Add error display in components:**

```typescript
import { getErrorDisplay } from '@/lib/errors';

function MyComponent() {
  const [error, setError] = useState<unknown>(null);

  const handleAction = async () => {
    try {
      // ... your action
    } catch (err) {
      setError(err);
    }
  };

  if (error) {
    const { title, message } = getErrorDisplay(error);
    return (
      <div className="error-message">
        <h3>{title}</h3>
        <p>{message}</p>
      </div>
    );
  }

  // ... rest of component
}
```

---

### Step 4: Integrate Logging

**4.1. Update `src/lib/contracts.ts`:**

```typescript
import { logger } from './logger';

export async function claimReward(
  signer: JsonRpcSigner,
  onChainId: number,
): Promise<string> {
  logger.info('Claiming reward', {
    component: 'Contract',
    action: 'claimReward',
    onChainId,
  });

  try {
    // ... existing code
    
    logger.transaction('submitted', tx.hash, { onChainId });
    const receipt = await tx.wait();
    logger.transaction('confirmed', receipt.hash, { onChainId });
    
    return receipt.hash;
  } catch (error) {
    logger.error('Failed to claim reward', error, { onChainId });
    throw handleContractError(error, 'claimReward');
  }
}
```

**4.2. Update `src/lib/api.ts`:**

```typescript
import { logger } from './logger';

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const method = options?.method || 'GET';
  
  logger.apiRequest(method, path);
  
  try {
    // ... existing fetch code
    
    logger.apiResponse(method, path, res.status);
    return res.json();
  } catch (error) {
    logger.apiError(method, path, error);
    throw handleAPIError(error, path);
  }
}
```

**4.3. Replace console.log statements:**

```bash
# Find all console.log usage
grep -r "console.log" src/

# Replace with logger.debug
# Example:
# Before: console.log('User connected:', address);
# After:  logger.debug('User connected', { address });
```

---

### Step 5: Improve Content Security Policy

**Update `next.config.mjs`:**

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
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // TODO: Remove unsafe-* after testing
            "style-src 'self' 'unsafe-inline'", // Required for Tailwind
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
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-DNS-Prefetch-Control", value: "on" },
      ],
    },
  ],
};

export default nextConfig;
```

**Test:**
```bash
npm run build
npm run start
# Check browser console for CSP violations
```

---

## Phase 2: Testing Infrastructure (Week 2-3)

### Step 1: Install Testing Dependencies

```bash
npm install --save-dev \
  jest \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  @types/jest \
  jest-environment-jsdom \
  @playwright/test
```

---

### Step 2: Configure Jest

**Create `jest.config.js`:**

```javascript
const nextJest = require('next/jest');

const createJestConfig = nextJest({
  dir: './',
});

const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

module.exports = createJestConfig(customJestConfig);
```

**Create `jest.setup.js`:**

```javascript
import '@testing-library/jest-dom';

// Mock window.ethereum
global.window = {
  ethereum: {
    request: jest.fn(),
    on: jest.fn(),
    removeListener: jest.fn(),
  },
};
```

---

### Step 3: Write First Tests

**Create `src/lib/__tests__/env.test.ts`:**

```typescript
import { validateEnv, hasContract, requireContract } from '../env';

describe('env validation', () => {
  it('should validate required variables', () => {
    expect(() => validateEnv()).not.toThrow();
  });

  it('should check contract availability', () => {
    const hasToken = hasContract('wvrnToken');
    expect(typeof hasToken).toBe('boolean');
  });

  it('should throw on missing required contract', () => {
    expect(() => requireContract('socialMining')).toThrow();
  });
});
```

**Create `src/lib/__tests__/errors.test.ts`:**

```typescript
import { WeavrnError, ErrorCode, handleWalletError } from '../errors';

describe('error handling', () => {
  it('should create WeavrnError', () => {
    const error = new WeavrnError(
      'Test error',
      ErrorCode.UNKNOWN_ERROR,
      'User message'
    );
    expect(error.code).toBe(ErrorCode.UNKNOWN_ERROR);
    expect(error.getUserMessage()).toBe('User message');
  });

  it('should handle user rejection', () => {
    const walletError = { code: 4001 };
    expect(() => handleWalletError(walletError)).toThrow(WeavrnError);
  });
});
```

**Run tests:**

```bash
npm test
npm run test:coverage
```

---

### Step 4: Configure Playwright

**Create `playwright.config.ts`:**

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

**Create `tests/home.spec.ts`:**

```typescript
import { test, expect } from '@playwright/test';

test('homepage loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Weavrn');
});

test('wallet connect button exists', async ({ page }) => {
  await page.goto('/mine');
  await expect(page.locator('text=Connect Wallet')).toBeVisible();
});
```

**Run E2E tests:**

```bash
npx playwright install
npm run test:e2e
```

---

## Phase 3: CI/CD Improvements (Week 3-4)

### Step 1: Update GitHub Actions

**Update `.github/workflows/deploy.yml`:**

```yaml
name: CI & Deploy
on:
  push:
    branches: [develop, qa, main]
  pull_request:
    branches: [develop, qa, main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      
      # Security audit
      - name: Security audit
        run: npm audit --audit-level=moderate
      
      # Type checking
      - name: Type check
        run: npm run type-check
      
      # Linting
      - name: Lint
        run: npm run lint
      
      # Unit tests
      - name: Unit tests
        run: npm test -- --coverage
      
      # Upload coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
  
  build:
    needs: test
    runs-on: ubuntu-latest
    environment: ${{ github.ref_name == 'main' && 'production' || github.ref_name == 'qa' && 'qa' || 'development' }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
        env:
          NEXT_PUBLIC_API_URL: ${{ vars.API_URL }}
          NEXT_PUBLIC_SOCIAL_MINING_ADDRESS: ${{ vars.SOCIAL_MINING_ADDRESS }}
          # ... other env vars
      - uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: out/
  
  # ... rest of deploy job
```

---

### Step 2: Add Pre-commit Hooks

**Install husky:**

```bash
npm install --save-dev husky lint-staged
npx husky install
```

**Create `.husky/pre-commit`:**

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npx lint-staged
```

**Add to `package.json`:**

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md}": [
      "prettier --write"
    ]
  }
}
```

---

## Phase 4: Additional Improvements (Month 2-3)

### Step 1: Add Error Boundaries

**Create `src/components/ErrorBoundary.tsx`:**

```typescript
'use client';

import { Component, ReactNode } from 'react';
import { logger } from '@/lib/logger';

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
    logger.error('Error boundary caught error', error, {
      component: 'ErrorBoundary',
      errorInfo,
    });
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-gray-900 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-6">
              We're sorry for the inconvenience. Please refresh the page or try again later.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-weavrn-accent text-white rounded-lg hover:bg-opacity-90 transition"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

**Wrap app in `src/app/layout.tsx`:**

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

### Step 2: Add Rate Limiting

**Create `src/lib/rate-limiter.ts`:**

```typescript
export class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 10, windowMs = 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  canMakeRequest(): boolean {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    return this.requests.length < this.maxRequests;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  async waitForSlot(): Promise<void> {
    while (!this.canMakeRequest()) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.recordRequest();
  }
}
```

**Use in `src/lib/api.ts`:**

```typescript
import { RateLimiter } from './rate-limiter';

const rateLimiter = new RateLimiter(10, 1000); // 10 requests per second

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  // Wait for rate limit slot
  await rateLimiter.waitForSlot();
  
  // ... rest of fetch logic
}
```

---

### Step 3: Enable TypeScript Strict Mode

**Update `tsconfig.json`:**

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    // ... other options
  }
}
```

**Fix type errors:**

```bash
npm run type-check
# Fix each error one by one
```

---

## Verification Checklist

After implementing all changes, verify:

- [ ] `npm run build` succeeds
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] `npm test` passes with >70% coverage
- [ ] `npm run test:e2e` passes
- [ ] `npm audit` shows no high/critical vulnerabilities
- [ ] All environment variables are validated
- [ ] Error handling is consistent across the app
- [ ] Logging is used instead of console.log
- [ ] CSP headers are properly configured
- [ ] Rate limiting is working
- [ ] Error boundaries catch React errors
- [ ] TypeScript strict mode is enabled

---

## Rollout Strategy

### Development Environment
1. Create feature branch: `git checkout -b feature/security-improvements`
2. Implement Phase 1 changes
3. Test thoroughly
4. Commit and push

### QA Environment
1. Merge to `qa` branch
2. Deploy to QA environment
3. Run full test suite
4. Manual testing
5. Fix any issues

### Production Environment
1. Merge to `main` branch
2. Deploy to production
3. Monitor error logs
4. Monitor performance metrics
5. Be ready to rollback if needed

---

## Monitoring After Deployment

### Metrics to Watch

1. **Error Rates**
   - Check error tracking service
   - Monitor error logs
   - Watch for new error patterns

2. **Performance**
   - Page load times
   - API response times
   - Transaction success rates

3. **Security**
   - CSP violation reports
   - Failed authentication attempts
   - Unusual wallet activity

### Rollback Plan

If issues are detected:

```bash
# Revert to previous version
git revert <commit-hash>
git push origin main

# Or rollback deployment
# (depends on your deployment platform)
```

---

## Support

If you encounter issues during implementation:

1. Check the detailed documentation in SECURITY_REVIEW.md
2. Review error messages carefully
3. Check the logs for more context
4. Consult the Next.js documentation
5. Reach out to the team for help

---

## Success Criteria

Implementation is complete when:

- ✅ All critical security issues are fixed
- ✅ All tests pass
- ✅ Code coverage is >70%
- ✅ No high/critical npm audit vulnerabilities
- ✅ TypeScript strict mode is enabled
- ✅ Error handling is centralized
- ✅ Logging is structured and sanitized
- ✅ CI/CD includes security checks
- ✅ Documentation is complete
- ✅ Team is trained on new patterns

---

**Good luck with the implementation! 🚀**

# Integration Examples

This document provides code examples for integrating the security fixes into your existing codebase.

## 1. Update API Calls with Security Utilities

### Before (Vulnerable)
```typescript
// src/lib/api.ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });
  
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  
  return res.json();
}
```

### After (Secure)
```typescript
// src/lib/api.ts
import { validateApiUrl, isAllowedOrigin, RateLimiter } from '@/lib/apiSecurity';
import { logger } from '@/lib/logger';

const API_URL = validateApiUrl(process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001");
const apiLimiter = new RateLimiter();

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  // Rate limiting
  if (!apiLimiter.isAllowed(`api:${path}`, 100, 60000)) {
    await logger.warn('API rate limit exceeded', { path });
    throw new Error('Too many requests. Please try again later.');
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string>),
  };
  
  if (hasSession()) {
    headers["Authorization"] = `Bearer ${sessionToken}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'include',
    });

    clearTimeout(timeout);

    // Validate CORS origin
    const allowOrigin = res.headers.get('access-control-allow-origin');
    if (!allowOrigin || !isAllowedOrigin(allowOrigin)) {
      await logger.error('Invalid CORS origin', { origin: allowOrigin, path });
      throw new Error('Invalid response origin');
    }

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      const msg = body.message || body.error || res.statusText;
      await logger.warn('API error', { path, status: res.status, message: msg });
      throw new Error(msg);
    }

    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    await logger.error('API call failed', { 
      path, 
      error: String(err),
      method: options?.method || 'GET'
    });
    throw err;
  }
}
```

---

## 2. Add Input Validation to Forms

### Before (Vulnerable)
```typescript
// src/components/YouTubeVerification.tsx
const handleStartVerification = async (e: React.FormEvent) => {
  e.preventDefault();
  const cleaned = handleInput.replace(/^@/, "").trim();
  if (!cleaned) return;
  
  // No validation!
  await startYouTubeVerification(signer, walletAddress, cleaned);
};
```

### After (Secure)
```typescript
// src/components/YouTubeVerification.tsx
import { validators, sanitizeInput } from '@/lib/apiSecurity';
import { logger } from '@/lib/logger';

const handleStartVerification = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Sanitize input
  const cleaned = sanitizeInput(handleInput.replace(/^@/, "").trim());
  
  // Validate format
  if (!validators.socialHandle(cleaned)) {
    setError('Invalid YouTube handle format');
    await logger.warn('Invalid YouTube handle submitted', { 
      input: cleaned.substring(0, 10) // Don't log full input
    });
    return;
  }
  
  if (!cleaned) return;
  
  setSubmitting(true);
  setError(null);
  
  try {
    if (!signer) {
      setError("Wallet not connected");
      return;
    }
    
    await startYouTubeVerification(signer, walletAddress, cleaned);
    await logger.info('YouTube verification started', { 
      handle: cleaned 
    });
    setHandleInput("");
    onUpdate();
  } catch (err: unknown) {
    const message = (err as Error).message;
    setError(message);
    await logger.error('YouTube verification failed', { 
      error: message,
      handle: cleaned
    });
  } finally {
    setSubmitting(false);
  }
};
```

---

## 3. Replace Markdown Components

### Before (Vulnerable)
```typescript
// src/components/JobChat.tsx
import ReactMarkdown from "react-markdown";

function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      allowedElements={["p", "code", "pre", ...]}
      components={{ ... }}
    >
      {content}
    </ReactMarkdown>
  );
}
```

### After (Secure)
```typescript
// src/components/JobChat.tsx
import SafeMarkdown from '@/components/SafeMarkdown';

function ChatMarkdown({ content }: { content: string }) {
  return (
    <SafeMarkdown 
      content={content}
      className="chat-markdown"
    />
  );
}
```

---

## 4. Add Rate Limiting to Verification

### Before (Vulnerable)
```typescript
// src/components/AgentRegistration.tsx
const handleRegister = async () => {
  if (!signer || !name.trim()) return;
  setSubmitting(true);
  
  try {
    const hash = await registerAgent(signer, name.trim(), metadataURI.trim());
    // No rate limiting!
  } catch (err: unknown) {
    setError((err as Error).message);
  } finally {
    setSubmitting(false);
  }
};
```

### After (Secure)
```typescript
// src/components/AgentRegistration.tsx
import { RateLimiter, validators, sanitizeInput } from '@/lib/apiSecurity';
import { logger } from '@/lib/logger';

const registerLimiter = new RateLimiter();

const handleRegister = async () => {
  // Rate limiting
  if (!registerLimiter.isAllowed('register-agent', 3, 300000)) { // 3 attempts per 5 min
    setError('Too many registration attempts. Please try again later.');
    await logger.warn('Registration rate limit exceeded');
    return;
  }

  // Validation
  const err = validateName(name);
  if (err) { 
    setNameError(err); 
    return; 
  }
  
  if (!signer || !name.trim()) return;
  
  setSubmitting(true);
  setError(null);
  
  try {
    const cleanName = sanitizeInput(name.trim());
    const cleanUri = sanitizeInput(metadataURI.trim());
    
    if (!validators.agentName(cleanName)) {
      setError('Invalid agent name');
      return;
    }
    
    const hash = await registerAgent(signer, cleanName, cleanUri);
    
    await logger.info('Agent registered', { 
      name: cleanName,
      txHash: hash
    });
    
    setTxHash(hash);
    setName("");
    setMetadataURI("");
    onRegistered();
  } catch (err: unknown) {
    const e = err as { message?: string };
    const message = e.message || "Registration failed";
    setError(message);
    
    await logger.error('Agent registration failed', { 
      error: message,
      name: name.substring(0, 10)
    });
  } finally {
    setSubmitting(false);
  }
};
```

---

## 5. Add Error Logging Throughout

### Before (Vulnerable)
```typescript
// src/components/WalletConnect.tsx
const connect = useCallback(async () => {
  if (!window.ethereum) {
    setError("Install MetaMask to continue");
    return;
  }
  
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    // ... rest of code
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 4001) return; // user rejected
    setError(e.message || "Connection failed");
    // No logging!
  }
}, [onConnect]);
```

### After (Secure)
```typescript
// src/components/WalletConnect.tsx
import { logger, logAuthEvent } from '@/lib/logger';

const connect = useCallback(async () => {
  if (!window.ethereum) {
    setError("Install MetaMask to continue");
    await logger.warn('MetaMask not installed');
    return;
  }
  
  setConnecting(true);
  setError(null);
  
  try {
    await window.ethereum.request({ method: "eth_requestAccounts" });
    
    const switched = await checkAndSwitchChain();
    if (!switched) {
      setError(`Switch to ${getChainConfig().name} to continue`);
      await logger.warn('Failed to switch chain');
      return;
    }
    
    const { signer, address: addr } = await getProviderAndSigner();
    
    await logAuthEvent('Wallet connected', addr);
    onConnect(addr, signer);
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    
    if (e.code === 4001) {
      // User rejected - don't log as error
      await logger.info('User rejected wallet connection');
      return;
    }
    
    const message = e.message || "Connection failed";
    setError(message);
    
    await logger.error('Wallet connection failed', { 
      error: message,
      code: e.code
    });
  } finally {
    setConnecting(false);
  }
}, [onConnect]);
```

---

## 6. Secure Admin Operations (Move to Backend)

### Before (Vulnerable - Client-Side)
```typescript
// src/app/admin/page.tsx
const [adminKey, setAdminKey] = useState("");

const handleLogin = (e: React.FormEvent) => {
  e.preventDefault();
  if (!adminKey.trim()) return;
  setAuthenticated(true);
  fetchBlocks(adminKey); // Passing key to frontend!
};

const fetchBlocks = async (key: string) => {
  const data = await getAdminBlocks(key); // Key exposed!
};
```

### After (Secure - Backend-Only)
```typescript
// src/app/admin/page.tsx
// Frontend only handles UI, backend handles auth

const [sessionToken, setSessionToken] = useState<string | null>(null);

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!adminKey.trim()) return;
  
  try {
    // Backend validates admin key and returns session token
    const response = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminKey }),
      credentials: 'include', // Include cookies
    });
    
    if (!response.ok) {
      throw new Error('Invalid admin key');
    }
    
    // Backend sets HttpOnly cookie, frontend doesn't see the key
    setSessionToken('authenticated');
    setAuthenticated(true);
    
    await logger.info('Admin logged in');
    fetchBlocks();
  } catch (err) {
    setError((err as Error).message);
    await logger.warn('Admin login failed');
  }
};

// Backend API call (no key passed)
const fetchBlocks = async () => {
  try {
    // Backend validates session cookie automatically
    const response = await fetch('/api/admin/blocks', {
      credentials: 'include', // Include session cookie
    });
    
    if (!response.ok) throw new Error('Failed to fetch blocks');
    
    const data = await response.json();
    setBlockStats(data);
  } catch (err) {
    setError((err as Error).message);
    await logger.error('Failed to fetch admin blocks', { 
      error: String(err)
    });
  }
};
```

### Backend Implementation (Node.js/Express)
```typescript
// backend/routes/admin.ts
import express from 'express';
import { validateAdminKey } from '../auth';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  const { adminKey } = req.body;
  
  // Validate admin key
  if (!validateAdminKey(adminKey)) {
    return res.status(401).json({ error: 'Invalid admin key' });
  }
  
  // Create session token
  const token = generateSessionToken();
  
  // Set HttpOnly cookie (frontend can't access)
  res.cookie('admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 3600000, // 1 hour
  });
  
  res.json({ success: true });
});

// Protected endpoint
router.get('/blocks', authenticateAdmin, async (req, res) => {
  // req.admin is set by authenticateAdmin middleware
  const blocks = await getBlocks();
  res.json(blocks);
});

// Middleware to verify admin session
function authenticateAdmin(req, res, next) {
  const token = req.cookies.admin_session;
  
  if (!token || !validateSessionToken(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  req.admin = true;
  next();
}

export default router;
```

---

## 7. Configure Backend Logging Endpoint

### Backend Implementation
```typescript
// backend/routes/logs.ts
import express from 'express';
import { saveLog } from '../services/logging';

const router = express.Router();

router.post('/logs', async (req, res) => {
  const { entries } = req.body;
  
  if (!Array.isArray(entries)) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  
  try {
    // Save logs to database
    for (const entry of entries) {
      await saveLog({
        level: entry.level,
        message: entry.message,
        context: entry.context,
        timestamp: entry.timestamp,
        userAgent: entry.userAgent,
        url: entry.url,
        ipAddress: req.ip,
      });
    }
    
    // Check for security alerts
    await checkSecurityAlerts(entries);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Failed to save logs:', err);
    res.status(500).json({ error: 'Failed to save logs' });
  }
});

async function checkSecurityAlerts(entries) {
  // Alert on suspicious patterns
  const errors = entries.filter(e => e.level === 'error');
  const warns = entries.filter(e => e.level === 'warn');
  
  if (errors.length > 5) {
    // Send alert
    await sendSecurityAlert('High error rate detected', { count: errors.length });
  }
  
  if (warns.some(w => w.message.includes('Rate limit'))) {
    // Send alert
    await sendSecurityAlert('Rate limit violations detected');
  }
}

export default router;
```

---

## 8. Update package.json

### Before (Vulnerable)
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

### After (Secure)
```json
{
  "dependencies": {
    "ethers": "6.13.0",
    "next": "14.2.0",
    "react": "18.3.0",
    "react-markdown": "10.1.0"
  },
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "audit": "npm audit",
    "audit:fix": "npm audit fix"
  }
}
```

Also update installation:
```bash
# Use npm ci instead of npm install
npm ci
```

---

## 9. Add Security Headers to Next.js

### Already Fixed in next.config.mjs
The updated `next.config.mjs` includes:
- Strict CSP (no unsafe-inline/eval)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- X-XSS-Protection: 1; mode=block
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: geolocation=(), microphone=(), camera=()

---

## 10. Testing the Fixes

### Unit Tests
```typescript
// tests/lib/apiSecurity.test.ts
import { validators, RateLimiter, sanitizeInput } from '@/lib/apiSecurity';

describe('apiSecurity', () => {
  describe('validators', () => {
    it('should validate wallet addresses', () => {
      expect(validators.walletAddress('0x' + 'a'.repeat(40))).toBe(true);
      expect(validators.walletAddress('invalid')).toBe(false);
    });

    it('should validate social handles', () => {
      expect(validators.socialHandle('valid_handle')).toBe(true);
      expect(validators.socialHandle('invalid handle!')).toBe(false);
      expect(validators.socialHandle('a'.repeat(31))).toBe(false);
    });

    it('should validate agent names', () => {
      expect(validators.agentName('Valid Agent')).toBe(true);
      expect(validators.agentName('a')).toBe(false);
      expect(validators.agentName('Invalid@Name')).toBe(false);
    });
  });

  describe('RateLimiter', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter();
      expect(limiter.isAllowed('test', 3)).toBe(true);
      expect(limiter.isAllowed('test', 3)).toBe(true);
      expect(limiter.isAllowed('test', 3)).toBe(true);
      expect(limiter.isAllowed('test', 3)).toBe(false);
    });

    it('should reset after window expires', (done) => {
      const limiter = new RateLimiter();
      expect(limiter.isAllowed('test', 1, 100)).toBe(true);
      expect(limiter.isAllowed('test', 1, 100)).toBe(false);
      
      setTimeout(() => {
        expect(limiter.isAllowed('test', 1, 100)).toBe(true);
        done();
      }, 150);
    });
  });

  describe('sanitizeInput', () => {
    it('should remove null bytes', () => {
      expect(sanitizeInput('hello\0world')).toBe('helloworld');
    });

    it('should trim whitespace', () => {
      expect(sanitizeInput('  hello  ')).toBe('hello');
    });

    it('should truncate to max length', () => {
      expect(sanitizeInput('a'.repeat(100), 50)).toBe('a'.repeat(50));
    });
  });
});
```

---

## Summary

These integration examples show how to:
1. ✅ Add security utilities to API calls
2. ✅ Validate user input on forms
3. ✅ Replace vulnerable markdown components
4. ✅ Implement rate limiting
5. ✅ Add error logging throughout
6. ✅ Move admin operations to backend
7. ✅ Configure backend logging
8. ✅ Pin dependencies
9. ✅ Add security headers
10. ✅ Test the fixes

Implement these changes in order of priority and test thoroughly before deployment.

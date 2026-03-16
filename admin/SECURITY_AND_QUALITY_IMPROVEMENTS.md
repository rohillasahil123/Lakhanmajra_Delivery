# Admin Panel: Security & Code Quality Improvement Plan

**Last Updated:** March 16, 2026  
**Status:** Planning & Execution  
**Target Completion:** 4 Phases

---

## 📋 Executive Summary

This document outlines a comprehensive improvement roadmap for the admin panel covering:
- **🔴 5+ Critical Security Issues**
- **🟠 6+ Code Quality Issues**
- **🟡 4+ Performance Issues**

All issues will be fixed through **4 Structured Phases** with clear deliverables.

---

# PHASE 1: CRITICAL SECURITY FIXES (Week 1)

## Overview
Fix authentication, data exposure, and XSS vulnerabilities before any other improvements.

---

## Issue 1.1: Token Storage in localStorage (XSS Vulnerability)

**File:** `admin/src/auth.ts`, `admin/src/api/client.ts`  
**Severity:** 🔴 CRITICAL  
**Impact:** Attackers can steal tokens via XSS attacks  
**Current Code:**
```typescript
// auth.ts
localStorage.setItem('token', token);

// api/client.ts
const token = localStorage.getItem('token');
config.headers.set('Authorization', `Bearer ${token}`);
```

**Problem:**
- Tokens stored in localStorage are accessible to JavaScript (XSS vulnerability)
- Any malicious script can steal the token
- No protection against CSRF attacks

**Solution:**
Use httpOnly cookies instead. Backend should handle:
1. Set `Set-Cookie: token=...; HttpOnly; Secure; SameSite=Strict`
2. Frontend sends credentials automatically
3. Remove token from localStorage completely

**Action Items:**

### Step 1: Update backend to send httpOnly cookie
**File to modify on backend:** `backend/src/controllers/auth.controller.ts`
```typescript
// Instead of:
res.json({ token });

// Do:
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'Strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
res.json({ message: 'Login successful' });
```

### Step 2: Update frontend API client
**File:** `admin/src/api/client.ts`
```typescript
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ← ADD THIS (sends cookies automatically)
});

// Remove the Authorization header interceptor after backend is updated
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // No longer need to set Authorization header manually
  // Cookies are sent automatically with withCredentials: true
  return config;
});
```

### Step 3: Remove localStorage token handling
**File:** `admin/src/auth.ts`
```typescript
// Remove these lines:
// localStorage.setItem('token', token);
// localStorage.removeItem('token');

export const logout = () => {
  // Backend should clear the cookie
  return api.post('/auth/logout');
};
```

### Step 4: Update logout endpoint
**File:** `admin/src/api/client.ts` (Response interceptor)
```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear on both frontend and backend
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Verification:**
- [ ] Token is NOT in localStorage
- [ ] Token is in httpOnly cookie (check Network tab → Cookies)
- [ ] Login/logout works seamlessly
- [ ] XSS attack cannot access token

**Estimated Time:** 30-40 minutes (requires backend coordination)

---

## Issue 1.2: Sensitive Error Information Exposure

**Files:** 
- `admin/src/hooks/useUsers.ts` (line 88, 111, 128, etc.)
- `admin/src/hooks/useProducts.ts`
- `admin/src/hooks/useOrders.ts`
- `admin/src/pages/Login.tsx` (line 23)

**Severity:** 🔴 CRITICAL  
**Impact:** Stack traces and API details exposed in console and UI  
**Current Code:**
```typescript
// useUsers.ts - line 88
console.error('Fetch users error:', errorMsg);
setError(errorMsg);

// Login.tsx - line 23
setError(err?.response?.data?.message || err?.message || 'Login failed');
```

**Problem:**
- error.message might contain sensitive info (API paths, database errors)
- Full error stack trace visible in browser console
- Users see technical errors instead of friendly messages

**Solution:**
Create error sanitization utility and use standardized error messages.

**Action Items:**

### Step 1: Create error sanitization utility
**File:** `admin/src/utils/errorHandler.ts` (NEW FILE)
```typescript
export interface SanitizedError {
  userMessage: string;
  code: string;
  shouldLog: boolean;
}

export const sanitizeError = (error: unknown): SanitizedError => {
  const DEFAULT_MESSAGE = 'Something went wrong. Please try again.';
  const DEFAULT_CODE = 'UNKNOWN_ERROR';

  if (!error) {
    return {
      userMessage: DEFAULT_MESSAGE,
      code: DEFAULT_CODE,
      shouldLog: false,
    };
  }

  if (error instanceof Error) {
    const isAxiosError = 'response' in error;
    
    if (isAxiosError) {
      const status = (error as any).response?.status;
      const apiMessage = (error as any).response?.data?.message;

      // Map API responses to user-friendly messages
      switch (status) {
        case 400:
          return {
            userMessage: 'Invalid input. Please check your data.',
            code: 'VALIDATION_ERROR',
            shouldLog: false,
          };
        case 401:
          return {
            userMessage: 'Session expired. Please login again.',
            code: 'UNAUTHORIZED',
            shouldLog: false,
          };
        case 403:
          return {
            userMessage: 'You do not have permission to perform this action.',
            code: 'FORBIDDEN',
            shouldLog: false,
          };
        case 404:
          return {
            userMessage: 'Resource not found.',
            code: 'NOT_FOUND',
            shouldLog: false,
          };
        case 500:
        case 502:
        case 503:
          return {
            userMessage: 'Server error. Please try again later.',
            code: 'SERVER_ERROR',
            shouldLog: true,
          };
        default:
          return {
            userMessage: DEFAULT_MESSAGE,
            code: 'HTTP_ERROR',
            shouldLog: true,
          };
      }
    }

    // Generic error - don't expose message
    return {
      userMessage: DEFAULT_MESSAGE,
      code: 'GENERIC_ERROR',
      shouldLog: true,
    };
  }

  return {
    userMessage: DEFAULT_MESSAGE,
    code: DEFAULT_CODE,
    shouldLog: false,
  };
};

export const logErrorSafely = (location: string, error: unknown) => {
  const sanitized = sanitizeError(error);
  
  if (sanitized.shouldLog) {
    // Only log non-sensitive info
    console.error(`[${location}] ${sanitized.code}`);
    // Could send to error tracking service (Sentry, etc.) here
  }
};
```

### Step 2: Update all hooks to use sanitized errors
**Files to update:**
- `admin/src/hooks/useUsers.ts`
- `admin/src/hooks/useProducts.ts`
- `admin/src/hooks/useOrders.ts`

**Example fix for useUsers.ts (line ~88):**
```typescript
// BEFORE:
catch (err) {
  const errorMsg = err instanceof Error ? err.message : 'Failed to fetch users';
  console.error('Fetch users error:', errorMsg);
  setError(errorMsg);
  setUsers([]);
}

// AFTER:
catch (err) {
  const sanitized = sanitizeError(err);
  logErrorSafely('fetchUsers', err);
  setError(sanitized.userMessage);
  setUsers([]);
}
```

### Step 3: Update Login page error handling
**File:** `admin/src/pages/Login.tsx` (line 23)
```typescript
// BEFORE:
setError(err?.response?.data?.message || err?.message || 'Login failed');

// AFTER:
const sanitized = sanitizeError(err);
logErrorSafely('login', err);
setError(sanitized.userMessage);
```

**Verification:**
- [ ] No error stack traces in console
- [ ] All errors are user-friendly messages
- [ ] Sensitive info not exposed
- [ ] Error codes logged (not messages)

**Estimated Time:** 45 minutes

---

## Issue 1.3: Missing CSRF Protection

**Files:** `admin/src/api/client.ts`, `admin/src/components/ProtectedRoute.tsx`  
**Severity:** 🔴 CRITICAL  
**Impact:** POST/PUT/DELETE requests vulnerable to CSRF attacks  
**Current Code:**
```typescript
// No CSRF token handling
api.post('/admin/users', data);
api.patch(`/admin/users/${id}`, data);
```

**Problem:**
- No CSRF tokens in requests
- Malicious sites can make requests on behalf of users
- No validation of request origin

**Solution:**
Add CSRF token validation (backend + frontend coordination).

**Action Items:**

### Step 1: Backend needs to provide CSRF token
**Coordinate with backend team:** Backend should provide CSRF token via:
1. Cookie: `XSRF-TOKEN`
2. Response header: `X-CSRF-Token`

### Step 2: Update API client to read and send CSRF token
**File:** `admin/src/api/client.ts`
```typescript
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Read CSRF token from cookie
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (csrfToken && ['post', 'put', 'patch', 'delete'].includes(config.method || '')) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }

  return config;
});
```

### Step 3: Add SameSite cookie policy
**Ensure in backend:**
```
Set-Cookie: token=...; SameSite=Strict; HttpOnly;
```

**Verification:**
- [ ] CSRF token sent in X-CSRF-Token header
- [ ] Backend validates CSRF token
- [ ] SameSite=Strict enforced

**Estimated Time:** 20 minutes (mostly backend coordination)

---

## Issue 1.4: No HTTPS Enforcement

**File:** `admin/src/api/client.ts`, `.env`  
**Severity:** 🔴 CRITICAL  
**Impact:** Man-in-the-middle attacks possible  
**Current Code:**
```typescript
const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';
```

**Problem:**
- Allows HTTP connections
- Sensitive data can be intercepted
- Tokens transmitted in clear text

**Solution:**
Force HTTPS in production.

**Action Items:**

### Step 1: Update environment validation
**File:** `admin/src/main.tsx`
```typescript
// Add at startup
if (import.meta.env.PROD) {
  if (window.location.protocol !== 'https:') {
    window.location.href = 'https:' + window.location.href.substring(5);
  }
}
```

### Step 2: Ensure API URL uses HTTPS
**File:** `.env` (production)
```
VITE_API_URL=https://api.yourdomain.com/api
```

### Step 3: Add Strict-Transport-Security header (backend)
Backend should send:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

**Verification:**
- [ ] HTTPS enforced in production
- [ ] All API calls use HTTPS
- [ ] HSTS header present

**Estimated Time:** 15 minutes

---

## Issue 1.5: No Input Validation Sanitization

**Files:** `admin/src/validations/userValidation.ts`, `admin/src/components/users/UserForm.tsx`  
**Severity:** 🔴 CRITICAL  
**Impact:** XSS, injection attacks  
**Current Code:**
```typescript
// No DOMPurify
<input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />

// Zod validates format but not content
email: z.string().email('Invalid email address')
```

**Problem:**
- User input not sanitized
- Malicious scripts can be injected
- Database values not escaped when displayed

**Solution:**
Add input sanitization library and output encoding.

**Action Items:**

### Step 1: Install sanitization library
```bash
npm install dompurify
npm install --save-dev @types/dompurify
```

### Step 2: Create sanitization utility
**File:** `admin/src/utils/sanitize.ts` (NEW FILE)
```typescript
import DOMPurify from 'dompurify';

export const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [] });
};

export const sanitizeForDisplay = (html: string): string => {
  return DOMPurify.sanitize(html);
};

// For form inputs, strip tags completely
export const sanitizeFormInput = (input: string): string => {
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim()
    .substring(0, 255); // Max length
};
```

### Step 3: Update form submission
**File:** `admin/src/hooks/useUsers.ts` (createUser, updateUser)
```typescript
const createUser = useCallback(
  async (data: Record<string, unknown>): Promise<IUser> => {
    try {
      setError(null);
      // Sanitize inputs before sending
      const sanitized = {
        name: sanitizeFormInput(String(data.name || '')),
        email: sanitizeFormInput(String(data.email || '')),
        phone: sanitizeFormInput(String(data.phone || '')),
        password: data.password ? sanitizeFormInput(String(data.password)) : undefined,
        roleId: data.roleId,
      };
      
      const res = await api.post('/admin/users', sanitized);
      // ...rest of code
    }
  },
  [fetchUsers]
);
```

### Step 4: Safe display of user data
**File:** Components that display user data**
```typescript
// Instead of:
<td>{user.name}</td>

// Use:
<td>{sanitizeForDisplay(user.name)}</td>
```

**Verification:**
- [ ] npm package dompurify installed
- [ ] All form inputs sanitized before API call
- [ ] User data safely displayed
- [ ] XSS injection attempts fail

**Estimated Time:** 40 minutes

---

## Phase 1 Completion Checklist

- [ ] Issue 1.1: Token moved from localStorage to httpOnly cookies
- [ ] Issue 1.2: Error messages sanitized, no stack traces exposed
- [ ] Issue 1.3: CSRF tokens implemented
- [ ] Issue 1.4: HTTPS enforced in production
- [ ] Issue 1.5: Input validation and sanitization added
- [ ] All tests pass
- [ ] No security warnings in console

**Estimated Total Time: 2-2.5 hours**

---

---

# PHASE 2: CODE QUALITY IMPROVEMENTS (Week 2)

## Overview
Improve TypeScript strictness, consistency, and code maintainability.

---

## Issue 2.1: Non-Strict TypeScript Configuration

**File:** `admin/tsconfig.json`  
**Severity:** 🟠 HIGH  
**Impact:** Type safety gaps, potential runtime errors  
**Current Code:**
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": false, // ← PROBLEM: Allows implicit any
    "skipLibCheck": true,
  }
}
```

**Problem:**
- `noImplicitAny: false` allows unsafe type inference
- Missing type safety on function parameters
- Silent failures possible

**Solution:**
Enable strict type checking.

**Action Items:**

### Step 1: Update TypeScript config
**File:** `admin/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2021",
    "useDefineForClassFields": true,
    "lib": ["DOM", "ES2021"],
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "strict": true,
    "noImplicitAny": true,           // ← CHANGE: Was false
    "noImplicitThis": true,           // ← ADD THIS
    "noUnusedLocals": true,           // ← ADD THIS
    "noUnusedParameters": true,       // ← ADD THIS
    "noImplicitReturns": true,        // ← ADD THIS
    "noFallthroughCasesInSwitch": true, // ← ADD THIS
    "noUncheckedIndexedAccess": true, // ← ADD THIS
    "esModuleInterop": true,
    "skipLibCheck": false,            // ← CHANGE: Was true - check libs too
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "src/vite-env.d.ts"],
  "exclude": ["node_modules"]
}
```

### Step 2: Run type checker and fix errors
```bash
npm run type-check
```

**Expected errors to fix:**
- Missing type annotations on functions
- Implicit any types
- Unused variables
- Missing return types

### Step 3: Fix any type errors in codebase

**Common fixes:**
```typescript
// BEFORE:
const fetchData = (params) => {
  // ...
};

// AFTER:
const fetchData = (params: Record<string, unknown>): Promise<void> => {
  // ...
};
```

**Verification:**
- [ ] `npm run type-check` passes with 0 errors
- [ ] No implicit any types
- [ ] All functions have return types

**Estimated Time:** 1-1.5 hours

---

## Issue 2.2: Inconsistent Error Handling Patterns

**Files:**
- `admin/src/hooks/useUsers.ts`
- `admin/src/hooks/useProducts.ts`
- `admin/src/hooks/useOrders.ts`

**Severity:** 🟠 HIGH  
**Impact:** Unpredictable behavior, hard to maintain  
**Current Code:**
```typescript
// Pattern 1 - useUsers.ts
catch (err) {
  const errorMsg = err instanceof Error ? err.message : 'Failed to create user';
  setError(errorMsg);
  throw err;
}

// Pattern 2 - useProducts.ts
catch (e: any) {
  setError(e.message || 'Error');
  // No throw
}

// Pattern 3 - useOrders.ts
catch (error) {
  // No error handling
}
```

**Problem:**
- Different patterns in different files
- Some throw, some don't
- Inconsistent error recovery

**Solution:**
Create a standardized error handling hook.

**Action Items:**

### Step 1: Create error handling hook
**File:** `admin/src/hooks/useErrorHandler.ts` (NEW FILE)
```typescript
import { useState, useCallback } from 'react';
import { sanitizeError, logErrorSafely } from '../utils/errorHandler';

export interface UseErrorHandlerReturn {
  error: string | null;
  setError: (error: string | null) => void;
  handleError: (error: unknown, location: string) => string;
  clearError: () => void;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown, location: string): string => {
    const sanitized = sanitizeError(err);
    logErrorSafely(location, err);
    setError(sanitized.userMessage);
    return sanitized.userMessage;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    setError,
    handleError,
    clearError,
  };
};
```

### Step 2: Update hooks to use standardized error handling
**File:** `admin/src/hooks/useUsers.ts` (Example)
```typescript
import { useErrorHandler } from './useErrorHandler';

export const useUsers = () => {
  const { error, setError, handleError, clearError } = useErrorHandler();
  
  const fetchUsers = useCallback(async (params?: FetchUsersParams): Promise<void> => {
    try {
      setLoading(true);
      clearError();
      // ... fetch logic
    } catch (err) {
      handleError(err, 'fetchUsers');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [clearError, handleError]);

  const createUser = useCallback(
    async (data: Record<string, unknown>): Promise<IUser> => {
      try {
        clearError();
        const res = await api.post('/admin/users', data);
        const newUser = res.data?.data ?? res.data;
        await fetchUsers({ page: 1 });
        return newUser;
      } catch (err) {
        const msg = handleError(err, 'createUser');
        throw new Error(msg);
      }
    },
    [fetchUsers, handleError, clearError]
  );

  // ... rest of hooks
  
  return { error, ...otherReturns };
};
```

### Step 3: Update all other hooks
Apply same pattern to:
- `useProducts.ts`
- `useOrders.ts`
- `useFormModal.ts`

**Verification:**
- [ ] All hooks use `useErrorHandler`
- [ ] Error messages consistent
- [ ] Error recovery predictable
- [ ] No `any` types in error handling

**Estimated Time:** 1.5 hours

---

## Issue 2.3: Mixed Styling Approaches (Inline vs Tailwind)

**Files:**
- `admin/src/components/users/UserForm.tsx` (lines 77-88)
- `admin/src/components/layout/Header.tsx`
- `admin/src/components/orders/OrderDetailModal.tsx`

**Severity:** 🟠 MEDIUM  
**Impact:** Inconsistent UI, harder to maintain  
**Current Code:**
```typescript
// UserForm.tsx - Inline styles
<div
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  }}
>

// Other files - Tailwind
<div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
```

**Problem:**
- Code duplication
- Styling inconsistency
- Hard to theme/customize
- Larger file sizes

**Solution:**
Convert all inline styles to Tailwind CSS.

**Action Items:**

### Step 1: Create modal component
**File:** `admin/src/components/common/Modal.tsx` (NEW FILE)
```typescript
import React from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  className = '',
}) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/30 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-xl shadow-lg p-6 max-w-2xl w-11/12 max-h-[90vh] overflow-y-auto ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};
```

### Step 2: Replace inline styles in UserForm.tsx
```typescript
// BEFORE:
<div style={{ position: 'fixed', top: 0, left: 0, ... }} onClick={onClose}>
  <div style={{ background: '#fff', borderRadius: 12, ... }}>

// AFTER:
<Modal open={open} onClose={onClose} title={isEditing ? 'Edit User' : 'Create User'}>
  <form className="flex flex-col gap-4">
    {/* form content */}
  </form>
</Modal>
```

### Step 3: Replace all inline header styles
**File:** `admin/src/components/layout/Header.tsx`
```typescript
// BEFORE:
<header style={{ height: 48, background: 'var(--header-bg, #fff)', ... }}>

// AFTER:
<header className="h-12 bg-white border-b border-slate-200 dark:bg-slate-900 dark:border-slate-700 flex items-center justify-between px-5 flex-shrink-0 z-50">
```

### Step 4: Create reusable component styles
Create `admin/src/components/common/` directory with:
- `Card.tsx`
- `Button.tsx`
- `Badge.tsx`
- `Input.tsx`

**Verification:**
- [ ] No inline `style={{}}` props
- [ ] All styling uses Tailwind classes
- [ ] Visual consistency maintained
- [ ] CSS file size reduced

**Estimated Time:** 2 hours

---

## Issue 2.4: No React.memo for List Items

**Files:**
- `admin/src/components/users/UserTableRow.tsx`
- `admin/src/components/products/ProductsTable.tsx`
- `admin/src/components/orders/OrderTable.tsx`

**Severity:** 🟠 MEDIUM  
**Impact:** Unnecessary re-renders, performance degradation  
**Current Code:**
```typescript
export function UserTableRow({ user, onEdit, onDelete }: Props) {
  return (
    <tr>
      <td>{user.name}</td>
      {/* ... */}
    </tr>
  );
}
```

**Problem:**
- Parent re-renders cause all rows to re-render
- No memoization of row components
- Performance issues with large lists

**Solution:**
Memoize list components with proper key management.

**Action Items:**

### Step 1: Wrap components with React.memo
**File:** `admin/src/components/users/UserTableRow.tsx`
```typescript
import React from 'react';

interface UserTableRowProps {
  user: IUser;
  onEdit: (user: IUser) => void;
  onDelete: (userId: string) => void;
}

const UserTableRowComponent: React.FC<UserTableRowProps> = ({
  user,
  onEdit,
  onDelete,
}) => {
  return (
    <tr className="border-b hover:bg-slate-50">
      <td>{user.name}</td>
      {/* ... */}
    </tr>
  );
};

// Memoize with custom comparison
export const UserTableRow = React.memo(UserTableRowComponent, (prev, next) => {
  return (
    prev.user._id === next.user._id &&
    prev.user.name === next.user.name &&
    prev.user.email === next.user.email &&
    prev.user.isActive === next.user.isActive
  );
});
```

### Step 2: Apply to all list item components
- `ProductTableRow.tsx`
- `OrderTableRow.tsx`
- `RiderTableRow.tsx`

### Step 3: Ensure parent uses proper keys
**File:** `admin/src/components/users/UserTable.tsx`
```typescript
// BEFORE:
{users.map((user, index) => (
  <UserTableRow key={index} user={user} {...props} />
))}

// AFTER:
{users.map((user) => (
  <UserTableRow key={user._id} user={user} {...props} />
))}
```

**Verification:**
- [ ] React.memo applied to all row components
- [ ] Keys are stable (`_id`, not index)
- [ ] No unnecessary re-renders in React DevTools

**Estimated Time:** 45 minutes

---

## Issue 2.5: No Request Response Caching

**Files:** `admin/src/api/client.ts`, `admin/src/hooks/useUsers.ts`  
**Severity:** 🟠 MEDIUM  
**Impact:** Duplicate API calls, server load  
**Current Code:**
```typescript
// Multiple identical requests
const { roles } = useUserInit(); // Calls /admin/roles
const updatedUser = await updateUser(); // Calls endpoint
const { roles: rolesAgain } = useUsers(); // Calls /admin/roles again
```

**Problem:**
- Same endpoint called multiple times
- No caching mechanism
- Unnecessary server load

**Solution:**
Implement request caching with cache invalidation.

**Action Items:**

### Step 1: Create caching utility
**File:** `admin/src/utils/cache.ts` (NEW FILE)
```typescript
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  invalidate(pattern: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const requestCache = new RequestCache();
```

### Step 2: Create cached API hook
**File:** `admin/src/hooks/useCachedApi.ts` (NEW FILE)
```typescript
import { useEffect, useState } from 'react';
import api from '../api/client';
import { requestCache } from '../utils/cache';

export const useCachedApi = <T,>(
  endpoint: string,
  options?: { ttl?: number }
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      // Check cache first
      const cached = requestCache.get<T>(endpoint);
      if (cached) {
        setData(cached);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get<T>(endpoint);
        const result = res.data;
        
        // Cache the result
        requestCache.set(endpoint, result, options?.ttl);
        setData(result);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, options?.ttl]);

  return { data, loading, error };
};
```

### Step 3: Use cached API in hooks
**File:** `admin/src/hooks/useUserInit.ts` (Example)
```typescript
import { useCachedApi } from './useCachedApi';

export const useUserInit = (onSuccess?: () => void) => {
  const { data: rolesData, loading: rolesLoading } = useCachedApi(
    '/admin/roles',
    { ttl: 10 * 60 * 1000 } // Cache for 10 minutes
  );

  // ... rest of logic
};
```

**Verification:**
- [ ] Same API called only once within TTL
- [ ] Cache invalidates on mutations
- [ ] Network requests reduced significantly

**Estimated Time:** 1 hour

---

## Issue 2.6: Missing Unused Code Cleanup

**Impact:** Dead code, larger bundle size  
**Current Issues:**
- Unused imports in files
- Unused variables
- Dead code branches

**Solution:**
Run linting and clean up.

**Action Items:**

### Step 1: Run ESLint with unused rules
```bash
npm run lint
```

### Step 2: Auto-fix unused imports
```bash
npm run lint:fix
```

### Step 3: Manually review and remove
- Unused exports
- Unused state variables
- Dead conditional branches

**Verification:**
- [ ] `npm run lint` passes cleanly
- [ ] No unused variables warnings
- [ ] No unused imports

**Estimated Time:** 30 minutes

---

## Phase 2 Completion Checklist

- [ ] Issue 2.1: TypeScript strict mode enabled
- [ ] Issue 2.2: Standardized error handling implemented
- [ ] Issue 2.3: Inline styles converted to Tailwind
- [ ] Issue 2.4: React.memo applied to list items
- [ ] Issue 2.5: Request caching implemented
- [ ] Issue 2.6: Unused code cleaned up
- [ ] `npm run lint` passes
- [ ] `npm run type-check` passes
- [ ] Visual regression tests pass

**Estimated Total Time: 6-7 hours**

---

---

# PHASE 3: PERFORMANCE OPTIMIZATION (Week 3)

## Overview
Improve load times, runtime performance, and user experience.

---

## Issue 3.1: No API Request Timeout & Retry Logic

**File:** `admin/src/api/client.ts`  
**Severity:** 🟡 MEDIUM  
**Impact:** Hanging requests, poor UX  
**Current Code:**
```typescript
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // No timeout!
});
```

**Problem:**
- Requests can hang indefinitely
- No retry on transient failures
- User thinks app is frozen

**Solution:**
Add timeout and exponential backoff retry.

**Action Items:**

### Step 1: Update API client with timeout and retry
**File:** `admin/src/api/client.ts`
```typescript
import axios, { AxiosHeaders, InternalAxiosRequestConfig } from 'axios';

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
  withCredentials: true,
});

// Exponential backoff retry logic
const maxRetries = 3;
const retryDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;

    // Don't retry if already retried too many times
    if (!config) return Promise.reject(error);

    config.retryCount = config.retryCount || 0;

    // Retry on network errors and specific status codes
    const shouldRetry =
      config.retryCount < maxRetries &&
      (!error.response || [408, 429, 500, 502, 503, 504].includes(error.response.status));

    if (shouldRetry) {
      config.retryCount += 1;
      const delay = retryDelay(config.retryCount);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(config);
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
```

### Step 2: Add request abort on unmount
**File:** `admin/src/hooks/useUsers.ts` (Example)
```typescript
import { useRef, useEffect } from 'react';
import axios from 'axios';

export const useUsers = () => {
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchUsers = useCallback(async (params?: FetchUsersParams): Promise<void> => {
    try {
      setLoading(true);
      clearError();

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      const res = await api.get('/admin/users', {
        params: {/* ... */},
        signal: abortControllerRef.current.signal,
      });

      // ... rest of logic
    } catch (err) {
      // Ignore abort errors
      if (axios.isCancel(err)) return;
      handleError(err, 'fetchUsers');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { /* ... */ };
};
```

**Verification:**
- [ ] Requests timeout after 15 seconds
- [ ] Automatic retry on network errors
- [ ] No hanging requests
- [ ] Requests cancelled on unmount

**Estimated Time:** 45 minutes

---

## Issue 3.2: Large Form Re-renders

**Files:** `admin/src/components/users/UserForm.tsx`, `admin/src/components/products/CreateProductModal.tsx`  
**Severity:** 🟡 MEDIUM  
**Impact:** Slow form input response  
**Current Code:**
```typescript
// Form inputs cause entire form to re-render
<input
  value={identifier}
  onChange={(e) => setIdentifier(e.target.value)}
/>
```

**Problem:**
- Large forms re-render on every keystroke
- Validation runs on every change
- Slow input feedback

**Solution:**
Use uncontrolled components or separate input state.

**Action Items:**

### Step 1: Optimize form with useCallback
**File:** `admin/src/components/users/UserForm.tsx`
```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback } from 'react';

export function UserForm({ /* props */ }) {
  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onTouched', // Only validate on blur, not on every change
  });

  const handleSubmit = useCallback(async (data: any) => {
    try {
      await onSubmit(data);
      form.reset();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  }, [onSubmit, form]);

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)}>
      {/* Use register for uncontrolled components */}
      <input
        {...form.register('name')}
        placeholder="User name"
      />
      {form.formState.errors.name && (
        <span className="text-red-500">{form.formState.errors.name.message}</span>
      )}
    </form>
  );
}

export default React.memo(UserForm);
```

### Step 2: Create FormInput component
**File:** `admin/src/components/common/FormInput.tsx` (NEW FILE)
```typescript
import React from 'react';
import { UseFormRegisterReturn, FieldError } from 'react-hook-form';

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: FieldError;
  register: UseFormRegisterReturn;
}

export const FormInput = React.memo(
  ({ label, error, register, ...props }: FormInputProps) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-500">{label}</label>}
      <input {...register} {...props} className="border rounded px-3 py-2" />
      {error && <span className="text-red-500 text-sm">{error.message}</span>}
    </div>
  )
);
```

**Verification:**
- [ ] Form input response is snappy
- [ ] No lag when typing
- [ ] Validation only on blur (not keystroke)

**Estimated Time:** 1 hour

---

## Issue 3.3: No Virtual Scrolling for Large Lists

**Files:**
- `admin/src/components/users/UserTable.tsx`
- `admin/src/components/products/ProductsTable.tsx`

**Severity:** 🟡 MEDIUM  
**Impact:** Slow list rendering with 1000+ items  
**Current Code:**
```typescript
{users.map((user) => (
  <UserTableRow key={user._id} user={user} {...props} />
))}
```

**Problem:**
- All rows rendered even if off-screen
- DOM bloat for large datasets
- Viewport scrolling is slow

**Solution:**
Implement windowing/virtual scrolling.

**Action Items:**

### Step 1: Install and configure react-window
```bash
npm install react-window
npm install --save-dev @types/react-window
```

### Step 2: Create virtual list component
**File:** `admin/src/components/common/VirtualTable.tsx` (NEW FILE)
```typescript
import React from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualTableProps<T> {
  items: T[];
  rowHeight: number;
  renderRow: (item: T, index: number) => React.ReactNode;
  height?: number;
  width?: string | number;
  itemCount?: number;
}

export const VirtualTable = React.memo(
  <T,>({
    items,
    rowHeight,
    renderRow,
    height = 500,
    width = '100%',
  }: VirtualTableProps<T>) => (
    <List
      height={height}
      itemCount={items.length}
      itemSize={rowHeight}
      width={width}
    >
      {({ index, style }) => (
        <div style={style}>{renderRow(items[index], index)}</div>
      )}
    </List>
  )
);
```

### Step 3: Use virtual table for large lists
**File:** `admin/src/components/users/UserTable.tsx`
```typescript
// For lists with pagination already, this is less critical
// But for product hierarchy view:
<VirtualTable
  items={products}
  rowHeight={48}
  width="100%"
  height={600}
  renderRow={(product, index) => (
    <ProductTableRow key={product._id} product={product} {...props} />
  )}
/>
```

**Note:** Since your tables have pagination, this is lower priority.

**Verification:**
- [ ] Large lists render smoothly
- [ ] Scroll performance is good
- [ ] Memory usage reasonable

**Estimated Time:** 1 hour

---

## Issue 3.4: No Image Lazy Loading

**Files:** `admin/src/pages/Products.tsx`, `admin/src/components/products/ProductsTable.tsx`  
**Severity:** 🟡 LOW  
**Impact:** Initial page load time  
**Current Code:**
```typescript
<img src={product.image} alt={product.name} />
```

**Problem:**
- All product images loaded immediately
- Large page size
- Slow page load

**Solution:**
Lazy load images.

**Action Items:**

### Step 1: Create lazy image component
**File:** `admin/src/components/common/LazyImage.tsx` (NEW FILE)
```typescript
import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  placeholder?: string;
}

export const LazyImage = React.memo(
  ({ src, alt, width, height, className, placeholder }: LazyImageProps) => {
    const [loaded, setLoaded] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const imgRef = useRef<HTMLImageElement>(null);

    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      });

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => observer.disconnect();
    }, []);

    return (
      <div
        style={{ width, height, background: placeholder || '#f0f0f0' }}
        className={className}
      >
        {isVisible && (
          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={() => setLoaded(true)}
            className={`w-full h-full object-cover transition-opacity ${
              loaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        )}
      </div>
    );
  }
);
```

### Step 2: Use lazy image in product listings
```typescript
<LazyImage
  src={product.image}
  alt={product.name}
  width={100}
  height={100}
  placeholder="#f5f5f5"
/>
```

**Verification:**
- [ ] Images load only when visible
- [ ] Smooth fade-in animation
- [ ] Page load time improved

**Estimated Time:** 45 minutes

---

## Issue 3.5: Missing Code Splitting

**File:** `admin/src/App.tsx`  
**Severity:** 🟡 MEDIUM  
**Impact:** Initial bundle size large  
**Current Code:**
```typescript
const Dashboard = lazy(() => import('./pages/Dashboard'));
// Good! Some pages lazy loaded

// But not all components are optimized
```

**Problem:**
- Some bundled together
- Large initial bundle
- Slow first contentful paint

**Solution:**
Ensure all routes are lazy loaded.

**Action Items:**

### Step 1: Verify all pages are lazy loaded
**File:** `admin/src/App.tsx` (Already good!)
```typescript
// ✓ Already using lazy/Suspense for pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Users = lazy(() => import('./pages/Users'));
// ...
```

### Step 2: Add route-level code splitting
**File:** `admin/src/App.tsx`
```typescript
import { Suspense, lazy } from 'react';

// Lazy load modal components for better code splitting
const UserFormModal = lazy(() => 
  import('./components/users/UserForm').then(m => ({ default: m.UserForm }))
);

const CreateProductModal = lazy(() => 
  import('./components/products/CreateProductModal')
);
```

### Step 3: Add bundle analysis
```bash
npm install --save-dev rollup-plugin-visualizer

# Add to vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      gzipSize: true,
    }),
  ],
};

# Run:
npm run build -- --outDir dist
# Opens bundle analysis visualization
```

**Verification:**
- [ ] Initial bundle < 200KB (gzipped)
- [ ] Code splitting working
- [ ] Lazy loading works smoothly

**Estimated Time:** 30 minutes

---

## Phase 3 Completion Checklist

- [ ] Issue 3.1: Request timeout and retry logic added
- [ ] Issue 3.2: Form re-renders optimized
- [ ] Issue 3.3: Virtual scrolling set up (optional)
- [ ] Issue 3.4: Image lazy loading implemented
- [ ] Issue 3.5: Code splitting verified
- [ ] Bundle size < 200KB gzipped
- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2s

**Estimated Total Time: 4-5 hours**

---

---

# PHASE 4: TESTING & DEPLOYMENT (Week 4)

## Overview
Add tests, validation, and prepare for production.

---

## Issue 4.1: No Unit Tests

**Severity:** 🟡 MEDIUM  
**Impact:** No regression detection, fragile code  

**Action Items:**

### Step 1: Install testing dependencies
```bash
npm install --save-dev vitest @testing-library/react @testing-library/user-event jsdom
```

### Step 2: Create test configuration
**File:** `vitest.config.ts` (NEW FILE)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [],
  },
});
```

### Step 3: Write tests for critical functionality
**File:** `admin/src/utils/cache.test.ts` (EXAMPLE)
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { RequestCache } from './cache';

describe('RequestCache', () => {
  let cache: RequestCache;

  beforeEach(() => {
    cache = new RequestCache();
  });

  it('should cache and retrieve data', () => {
    const data = { id: 1, name: 'Test' };
    cache.set('key1', data);
    expect(cache.get('key1')).toEqual(data);
  });

  it('should return null for expired entries', async () => {
    cache.set('key1', { test: true }, 100);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(cache.get('key1')).toBeNull();
  });
});
```

**Verification:**
- [ ] Test suite runs
- [ ] Critical functions tested
- [ ] > 50% code coverage

**Estimated Time:** 2-3 hours

---

## Issue 4.2: No Environment Variable Validation

**File:** `admin/src/main.tsx`  
**Severity:** 🟡 MEDIUM  
**Impact:** Silent failures on deployment  

**Action Items:**

### Step 1: Create environment validator
**File:** `admin/src/utils/env.ts` (NEW FILE)
```typescript
const REQUIRED_ENV_VARS = ['VITE_API_URL'] as const;

export const validateEnvironment = (): void => {
  const missing: string[] = [];

  for (const envVar of REQUIRED_ENV_VARS) {
    if (!import.meta.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    );
  }
};
```

### Step 2: Call validation on startup
**File:** `admin/src/main.tsx`
```typescript
import { validateEnvironment } from './utils/env';

validateEnvironment();

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Verification:**
- [ ] Missing env vars caught at startup
- [ ] Clear error message
- [ ] Fails fast before rendering

**Estimated Time:** 20 minutes

---

## Issue 4.3: No Sentry Error Tracking

**Severity:** 🟡 MEDIUM  
**Impact:** Production errors undetected  

**Action Items:**

### Step 1: Install Sentry
```bash
npm install @sentry/react @sentry/tracing
```

### Step 2: Initialize Sentry
**File:** `admin/src/main.tsx`
```typescript
import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new BrowserTracing(),
      new Sentry.Replay(),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
```

### Step 3: Wrap App with Sentry
```typescript
const SentryApp = Sentry.withProfiler(App);

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <SentryApp />
    </BrowserRouter>
  </React.StrictMode>
);
```

**Verification:**
- [ ] Sentry initialized in production
- [ ] Error tracking working
- [ ] Session replay enabled

**Estimated Time:** 30 minutes

---

## Issue 4.4: Pre-Deployment Checklist

**Action Items:**

### Security Checklist
- [ ] HTTPS enforced
- [ ] Tokens in httpOnly cookies
- [ ] CSRF protection enabled
- [ ] Input sanitization working
- [ ] Error messages don't expose details
- [ ] No secrets in code
- [ ] No hardcoded API URLs

### Performance Checklist
- [ ] Bundle size < 200KB gzipped
- [ ] First Contentful Paint < 2s
- [ ] Lighthouse score > 80
- [ ] Images lazy loaded
- [ ] Code splitting verified
- [ ] Cache headers configured

### Code Quality Checklist
- [ ] TypeScript strict mode passing
- [ ] ESLint passes with 0 warnings
- [ ] No console.log/debug statements
- [ ] No unused code
- [ ] React DevTools warnings resolved

### Testing Checklist
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual smoke testing done
- [ ] Cross-browser testing done
- [ ] Mobile responsive verified

### Deployment Checklist
- [ ] Environment variables configured
- [ ] Sentry initialized
- [ ] API endpoints verified
- [ ] Database backups done
- [ ] Rollback plan ready

**Estimated Time:** 2 hours for full verification

---

## Phase 4 Completion Checklist

- [ ] Issue 4.1: Unit tests written (> 50% coverage)
- [ ] Issue 4.2: Environment validation in place
- [ ] Issue 4.3: Sentry error tracking configured
- [ ] Issue 4.4: Pre-deployment checklist passed
- [ ] Code review completed
- [ ] QA testing passed
- [ ] Ready for production deployment

**Estimated Total Time: 5-7 hours**

---

---

# OVERALL EXECUTION PLAN

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Phase 1: Security | 2-2.5 hours | Not Started |
| Phase 2: Code Quality | 6-7 hours | Not Started |
| Phase 3: Performance | 4-5 hours | Not Started |
| Phase 4: Testing & Deploy | 5-7 hours | Not Started |
| **TOTAL** | **17-21.5 hours** | |

## Recommended Execution Order

1. **Priority 1 First (Day 1-2)**: Phase 1 (Security critical)
2. **Priority 2 Next (Day 3-4)**: Phase 2 (Code quality improves maintainability)
3. **Priority 3 Then (Day 5)**: Phase 3 (Performance optimization)
4. **Priority 4 Finally (Day 6-7)**: Phase 4 (Testing & validation)

## Team Coordination

### Backend Team Needs
- [ ] Update auth endpoints to use httpOnly cookies
- [ ] Implement CSRF token validation
- [ ] Add HSTS headers
- [ ] Coordinate API error response formats

### DevOps Team Needs
- [ ] Configure HTTPS with SSL certificates
- [ ] Set up Sentry DSN
- [ ] Configure environment variables
- [ ] Set up staging environment for testing

### QA Team Needs
- [ ] Security testing (XSS, CSRF, injection)
- [ ] Cross-browser compatibility
- [ ] Mobile responsiveness
- [ ] Performance testing

---

# TRACKING & PROGRESS

## Completed Items
- [ ] Phase 1, Issue 1: Token storage (httpOnly cookies)
- [ ] Phase 1, Issue 2: Error sanitization
- [ ] Phase 1, Issue 3: CSRF protection
- [ ] Phase 1, Issue 4: HTTPS enforcement
- [ ] Phase 1, Issue 5: Input sanitization
- [ ] Phase 2, Issue 1: TypeScript strict mode
- [ ] Phase 2, Issue 2: Error handling standardization
- [ ] Phase 2, Issue 3: Styling consolidation
- [ ] Phase 2, Issue 4: React.memo optimization
- [ ] Phase 2, Issue 5: Request caching
- [ ] Phase 2, Issue 6: Code cleanup
- [ ] Phase 3, Issue 1: Request timeout & retry
- [ ] Phase 3, Issue 2: Form optimization
- [ ] Phase 3, Issue 3: Virtual scrolling
- [ ] Phase 3, Issue 4: Image lazy loading
- [ ] Phase 3, Issue 5: Code splitting
- [ ] Phase 4, Issue 1: Unit tests
- [ ] Phase 4, Issue 2: Environment validation
- [ ] Phase 4, Issue 3: Error tracking (Sentry)
- [ ] Phase 4, Issue 4: Pre-deployment checklist

## Notes
- Each issue has clear action items with code examples
- Estimated times are for average developer
- Can be parallelized where possible
- Backend coordination required for Phase 1

---

**Document Version:** 1.0  
**Last Updated:** March 16, 2026  
**Next Review:** After Phase 1 completion

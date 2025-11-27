# 🚀 Production Migration Guide - Authentication

Step-by-step guide to migrate SCADA Pro from development (demo auth) to production (real authentication).

---

## 📋 Overview

**Current State (v0.1.0 - Development):**
- ✅ Demo authentication (admin/admin123)
- ✅ In-memory user data
- ✅ localStorage persistence
- ✅ No backend API calls for auth
- ✅ Test-ready with full RBAC

**Target State (v0.2.0+ - Production):**
- ✅ Real backend authentication
- ✅ Database-backed users
- ✅ JWT or OAuth tokens
- ✅ Secure API calls
- ✅ User management system
- ✅ Password policies
- ✅ Audit logging

---

## 🔄 Migration Timeline

```
Phase 1: Preparation          (1-2 weeks)
  ├─ Design auth API
  ├─ Create backend endpoints
  └─ Set up JWT infrastructure

Phase 2: Backend Implementation  (2-3 weeks)
  ├─ Implement /api/auth/login
  ├─ Implement /api/auth/logout
  ├─ Implement /api/auth/refresh
  └─ Set up database schema

Phase 3: Frontend Integration    (1-2 weeks)
  ├─ Update authService.ts
  ├─ Test with real backend
  ├─ Update error handling
  └─ Performance tuning

Phase 4: Deployment & Testing   (1-2 weeks)
  ├─ Staging environment test
  ├─ Security audit
  ├─ Production deployment
  └─ Monitoring setup

Total: 5-9 weeks
```

---

## 🛠️ Implementation Steps

### Step 1: Design Backend Auth API

Create these backend endpoints (Python/FastAPI example):

```python
from fastapi import FastAPI, HTTPException
from datetime import datetime, timedelta
import jwt

app = FastAPI()

SECRET_KEY = "your-secret-key-here"  # Use environment variable
ALGORITHM = "HS256"

# Request/Response Models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    role: str
    permissions: List[str]
    expires_at: int

# Endpoints
@app.post("/api/auth/login")
async def login(request: LoginRequest):
    # 1. Find user in database
    user = await db.find_user(request.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # 2. Verify password (use bcrypt or similar)
    if not verify_password(request.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # 3. Generate JWT token (24 hour expiry)
    expires_at = datetime.utcnow() + timedelta(hours=24)
    token = jwt.encode({
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "permissions": user.permissions,
        "exp": expires_at
    }, SECRET_KEY, algorithm=ALGORITHM)
    
    # 4. Return token
    return LoginResponse(
        access_token=token,
        token_type="bearer",
        user_id=user.id,
        username=user.username,
        role=user.role,
        permissions=user.permissions,
        expires_at=int(expires_at.timestamp() * 1000)
    )

@app.post("/api/auth/logout")
async def logout(token: str):
    # Optional: Invalidate token (blacklist approach)
    await invalidate_token(token)
    return {"success": True}

@app.post("/api/auth/refresh")
async def refresh_token(refresh_token: str):
    # Validate refresh token
    payload = jwt.decode(refresh_token, SECRET_KEY, algorithms=[ALGORITHM])
    
    # Generate new access token
    expires_at = datetime.utcnow() + timedelta(hours=24)
    new_token = jwt.encode({
        "sub": payload["sub"],
        "username": payload["username"],
        "role": payload["role"],
        "permissions": payload["permissions"],
        "exp": expires_at
    }, SECRET_KEY, algorithm=ALGORITHM)
    
    return {
        "access_token": new_token,
        "expires_at": int(expires_at.timestamp() * 1000)
    }

@app.get("/api/auth/me")
async def get_current_user(token: str = Header(...)):
    # Verify token
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    
    user = await db.find_user(payload["sub"])
    return {
        "user_id": user.id,
        "username": user.username,
        "role": user.role,
        "permissions": user.permissions
    }
```

---

### Step 2: Update Frontend authService

Replace demo authentication with real API calls:

**File: `frontend/services/authService.ts`**

```typescript
// Before (Demo)
async login(credentials: AuthCredentials): Promise<AuthUser> {
  if (credentials.username === 'admin' && credentials.password === 'admin123') {
    return { /* mock user */ };
  }
  throw new Error('Invalid credentials');
}

// After (Production)
async login(credentials: AuthCredentials): Promise<AuthUser> {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': await getCsrfToken(),
      },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Authentication failed');
    }

    const data = await response.json();

    const user: AuthUser = {
      id: data.user_id,
      username: data.username,
      role: data.role,
      permissions: data.permissions,
      token: data.access_token,
      expiresAt: data.expires_at,
    };

    this.setUser(user);
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Updated logout
async logout(): Promise<void> {
  const token = this.getToken();
  
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.warn('Logout API call failed:', error);
  }

  this.clearUser();
  this.notifyListeners();
}

// Updated token refresh
async refreshToken(): Promise<void> {
  const token = this.getToken();
  
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: token }),
    });

    const data = await response.json();
    const user = this.getCurrentUser();
    
    if (user) {
      user.token = data.access_token;
      user.expiresAt = data.expires_at;
      this.setUser(user);
    }
  } catch (error) {
    console.error('Token refresh failed:', error);
    this.clearUser();
  }
}
```

---

### Step 3: Add API Base URL Configuration

Create environment-based configuration:

**File: `frontend/.env.production`**
```
VITE_API_BASE_URL=https://api.scadapro.com
VITE_AUTH_TIMEOUT=24
VITE_TOKEN_REFRESH_INTERVAL=60
```

**File: `frontend/.env.development`**
```
VITE_API_BASE_URL=http://localhost:8000
VITE_AUTH_TIMEOUT=24
VITE_TOKEN_REFRESH_INTERVAL=60
```

**Update authService:**
```typescript
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async login(credentials) {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    // ...
  });
}
```

---

### Step 4: Add Request Interceptor

Automatically attach token to all API requests:

**File: `frontend/services/apiClient.ts` (NEW)**

```typescript
export const createApiClient = (baseURL: string) => {
  const api = fetch;

  const request = async (
    url: string,
    options: RequestInit = {}
  ): Promise<Response> => {
    const token = authService.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const fullUrl = `${baseURL}${url}`;

    const response = await api(fullUrl, {
      ...options,
      headers,
    });

    // Handle token expiry
    if (response.status === 401) {
      authService.logout();
      window.location.href = '/login';
    }

    return response;
  };

  return {
    get: (url: string) => request(url, { method: 'GET' }),
    post: (url: string, body: any) => 
      request(url, { method: 'POST', body: JSON.stringify(body) }),
    put: (url: string, body: any) => 
      request(url, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (url: string) => request(url, { method: 'DELETE' }),
  };
};

export const apiClient = createApiClient(
  import.meta.env.VITE_API_BASE_URL
);
```

---

### Step 5: Update Error Handling

Add better error messages:

```typescript
async login(credentials) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      switch (response.status) {
        case 400:
          throw new Error('Invalid username or password');
        case 401:
          throw new Error('Authentication failed');
        case 429:
          throw new Error('Too many login attempts. Please try again later.');
        case 500:
          throw new Error('Server error. Please try again later.');
        default:
          throw new Error('Login failed');
      }
    }

    return await response.json();
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}
```

---

### Step 6: Add Password Change Functionality

Implement password change in frontend:

**File: `frontend/features/auth/ChangePasswordPage.tsx` (NEW)**

```tsx
import { useState } from 'react';
import { useAuth } from './useAuth';

export const ChangePasswordPage = () => {
  const { changePassword } = useAuth();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await changePassword(oldPassword, newPassword);
      setMessage('Password changed successfully');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Change Password</h2>
      {error && <div className="error">{error}</div>}
      {message && <div className="success">{message}</div>}
      
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Old Password"
          value={oldPassword}
          onChange={(e) => setOldPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New Password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
};
```

---

### Step 7: Database Schema

Create database tables for users:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

-- User permissions table
CREATE TABLE user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  permission VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, permission)
);

-- Audit log table
CREATE TABLE auth_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(50) NOT NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  success BOOLEAN,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_auth_audit_created ON auth_audit_log(created_at);
```

---

## ✅ Deployment Checklist

### Pre-Deployment (1 week before)

- [ ] All backend endpoints tested
- [ ] All frontend integration tested
- [ ] Database schema created and tested
- [ ] SSL/TLS certificates configured
- [ ] Environment variables set
- [ ] Security audit completed
- [ ] Load testing completed

### Deployment Day

- [ ] Backup production database
- [ ] Deploy backend code
- [ ] Run database migrations
- [ ] Test backend endpoints
- [ ] Deploy frontend code
- [ ] Test login with real users
- [ ] Monitor error logs

### Post-Deployment (1 week after)

- [ ] Monitor login errors
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Fix any issues
- [ ] Decommission demo credentials

---

## 🔐 Security Considerations

### Passwords
- [ ] Use bcrypt or argon2 for hashing
- [ ] Enforce password policy (min 12 chars, complexity)
- [ ] Add password expiry (every 90 days)
- [ ] Don't store plain text passwords

### Tokens
- [ ] Use HTTPS only
- [ ] Set short expiry (24 hours)
- [ ] Use refresh tokens for long sessions
- [ ] Include token rotation

### API Security
- [ ] Use CORS properly
- [ ] Add rate limiting
- [ ] Add request validation
- [ ] Add CSRF protection
- [ ] Log all auth attempts

### Database
- [ ] Encrypt sensitive data at rest
- [ ] Use parameterized queries
- [ ] Regular backups
- [ ] Access control

---

## 🧪 Testing Checklist

- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Token refresh works
- [ ] Token expiry handled
- [ ] API calls include token
- [ ] Unauthorized requests rejected
- [ ] Multiple login attempts handled
- [ ] Logout clears session
- [ ] Password change works
- [ ] Forgot password works (if implemented)

---

## 📊 Monitoring

Set up monitoring for:

1. **Login Success Rate**
   - Alert if < 90% success

2. **Failed Login Attempts**
   - Alert if > 5 per minute per IP

3. **Token Generation Time**
   - Alert if > 100ms

4. **API Response Times**
   - Alert if > 500ms

5. **Error Rates**
   - Alert if > 1% errors

---

## 🔗 Related Documentation

- [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md) - Current auth system
- [doc/DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md) - Deployment guide
- [backend/DOCS/backend_API_DOCUMENTATION.md](../backend/DOCS/backend_API_DOCUMENTATION.md) - Backend API

---

## 📞 Support

For migration questions:
1. Review backend API documentation
2. Check security best practices
3. Run security audit
4. Contact DevOps team

---

**Production Migration Guide v0.1.0** 🚀

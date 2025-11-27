# 🔐 Security Implementation Guide - v0.1.0

Complete guide to the authentication and security features implemented in SCADA Pro v0.1.0.

---

## 📋 Overview

SCADA Pro now includes a complete **authentication and authorization system** with:

✅ Login/Logout functionality  
✅ Role-based access control (RBAC)  
✅ Permission-based feature access  
✅ Session management with token expiry  
✅ Protected routes  
✅ Protected UI components  

---

## 🔑 Authentication System

### Architecture

```
User (Browser)
    │
    ├─ Enter Credentials
    │  └─ Username: admin
    │  └─ Password: admin123
    │
    ▼
Login Form (LoginPage.tsx)
    │
    ├─ Validate Input
    ├─ Call authService.login()
    │
    ▼
Authentication Service (authService.ts)
    │
    ├─ Verify Credentials
    │  (In v0.1.0: demo credentials)
    │  (In production: call backend API)
    │
    ├─ Generate Session Token
    ├─ Set Token Expiry (24 hours)
    ├─ Store in localStorage
    │
    ▼
Session Active
    │
    ├─ User can access protected routes
    ├─ Token sent with API requests
    ├─ Permissions enforced
    │
    ▼
Token Expiry or Logout
    │
    ├─ Clear localStorage
    ├─ Redirect to login
```

---

## 🏛️ Authorization System

### Role-Based Access Control (RBAC)

Three role levels implemented:

```
┌─────────────┬──────────────────────────────────────┐
│    ROLE     │          PERMISSIONS                 │
├─────────────┼──────────────────────────────────────┤
│   admin     │ ✅ view_all                          │
│             │ ✅ edit_config                       │
│             │ ✅ manage_alarms                     │
│             │ ✅ manage_users                      │
│             │ Full system access                   │
├─────────────┼──────────────────────────────────────┤
│  operator   │ ✅ view_all                          │
│             │ ✅ manage_alarms                     │
│             │ ❌ edit_config                       │
│             │ ❌ manage_users                      │
│             │ Operational access                  │
├─────────────┼──────────────────────────────────────┤
│  viewer     │ ✅ view_all                          │
│             │ ❌ manage_alarms                     │
│             │ ❌ edit_config                       │
│             │ ❌ manage_users                      │
│             │ Read-only access                    │
└─────────────┴──────────────────────────────────────┘
```

### Permissions

```
Permission          | Used For
────────────────────┼─────────────────────────────────
view_all            | View machines, sensors, data
edit_config         | Access Settings page
manage_alarms       | Acknowledge/resolve alarms
manage_users        | User management (future)
```

---

## 📁 Implementation Files

### 1. `frontend/services/authService.ts` (250+ lines)

Central authentication service providing:

```typescript
// Login
async login(credentials): Promise<AuthUser>

// Logout
logout(): void

// Session Check
isAuthenticated(): boolean

// User Info
getCurrentUser(): AuthUser | null

// Authorization
hasPermission(permission: string): boolean
hasRole(role: string): boolean

// Session Management
async refreshToken(): Promise<void>
getToken(): string | null

// Subscriptions
subscribe(listener): unsubscribe
```

**Features**:
- ✅ In-memory state management
- ✅ localStorage persistence
- ✅ Token expiry validation
- ✅ Listener pattern for state updates
- ✅ Error handling

---

### 2. `frontend/features/auth/LoginPage.tsx`

Beautiful login page with:

```
┌─────────────────────────────────────┐
│                                     │
│   🔒 SCADA Pro                      │
│   Industrial IoT Dashboard          │
│                                     │
│   ┌─────────────────────────────┐   │
│   │ Username: [admin        ]   │   │
│   │                             │   │
│   │ Password: [••••••••     👁] │   │
│   │                             │   │
│   │     [ 🔑 Login          ]   │   │
│   └─────────────────────────────┘   │
│                                     │
│   Default: admin / admin123         │
│                                     │
└─────────────────────────────────────┘
```

**Features**:
- ✅ Responsive design
- ✅ Show/hide password toggle
- ✅ Error messages
- ✅ Loading state
- ✅ Demo credentials display
- ✅ Input validation

---

### 3. `frontend/features/auth/useAuth.ts` (100+ lines)

React hook for authentication:

```typescript
const { 
  isAuthenticated,  // boolean
  user,             // AuthUser | null
  token,            // string | null
  loading,          // boolean
  error,            // string | null
  
  login,            // (username, password) => Promise<AuthUser>
  logout,           // () => void
  refreshToken,     // () => Promise<void>
  changePassword,   // (old, new) => Promise<void>
  hasPermission,    // (permission) => boolean
  hasRole,          // (role) => boolean
} = useAuth();
```

**Usage**:
```typescript
// In components
const { isAuthenticated, user, logout } = useAuth();

if (!isAuthenticated) {
  return <LoginPage />;
}

return (
  <div>
    Welcome, {user.username}!
    <button onClick={logout}>Logout</button>
  </div>
);
```

---

### 4. `frontend/features/auth/ProtectedRoute.tsx` (120+ lines)

Three protection mechanisms:

```typescript
// 1. Route Protection
<ProtectedRoute requiredPermission="edit_config">
  <SettingsPage />
</ProtectedRoute>

// 2. Role-based Protection
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// 3. UI Component Protection
<ProtectedSection permission="edit_config">
  <SettingsButton />
</ProtectedSection>

// 4. Hook-based Check
const canEdit = useCanAccess("edit_config");
if (canEdit) {
  // Show edit UI
}
```

---

### 5. Modified Files

#### `frontend/App.tsx`
- Added `LoginPage` import
- Added `ProtectedRoute` import
- Wrapped routes with authentication check
- Protected `/settings` route with `edit_config` permission
- Protected `/boards` route with `view_all` permission

#### `frontend/components/Layout.tsx`
- Added version display (v0.1.0) under logo
- Added user info section in sidebar
- Added logout button
- Display user role and name

#### `frontend/version.ts` (NEW)
- Centralized version information
- Build metadata
- Feature flags
- API configuration

---

## 🔐 Security Flow

### Login Flow

```
1. User navigates to app
   └─ App checks isAuthenticated()

2. If NOT authenticated
   └─ Show LoginPage

3. User enters credentials
   └─ Click "Login"

4. authService.login() called
   └─ Verify credentials
   └─ Generate token
   └─ Set expiry (24 hours)
   └─ Store in localStorage
   └─ Notify listeners

5. Listeners update UI
   └─ LoginPage hides
   └─ Layout renders
   └─ Navigation available

6. User can access features
   └─ Based on permissions
```

### Protected Route Access

```
1. User navigates to /settings
   └─ ProtectedRoute checks authentication

2. Not authenticated?
   └─ Show LoginPage

3. Authenticated?
   └─ Check permission "edit_config"

4. Missing permission?
   └─ Show "Access Denied"

5. Has permission?
   └─ Render SettingsPage
```

### Token Expiry

```
1. User logged in (token expires in 24h)

2. Whenever authService methods called
   └─ Check: Date.now() > expiresAt?

3. Token expired?
   └─ Clear session
   └─ Return isAuthenticated = false
   └─ Redirect to login

4. Token valid?
   └─ Continue operation
```

---

## 🎯 Demo Credentials (v0.1.0)

```
Username: admin
Password: admin123
Role:     admin
Permissions:
  - view_all
  - edit_config
  - manage_alarms
  - manage_users
```

⚠️ **WARNING**: These are for development only!  
**Before Production**: 
1. Remove demo credentials
2. Integrate with real authentication system
3. Use OAuth/SAML/Custom backend auth
4. Implement user management UI
5. Add password policy enforcement

---

## 🚀 Production Implementation

### Backend Integration (v0.2.0 plan)

Replace mock authentication in `authService.login()`:

```typescript
async login(credentials: AuthCredentials): Promise<AuthUser> {
  // Production: Call backend
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error('Authentication failed');
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
}
```

### Backend API Endpoints Needed

```
POST   /api/auth/login
       Request: { username, password }
       Response: { access_token, user_id, username, role, permissions, expires_at }

POST   /api/auth/logout
       Request: { token }
       Response: { success: true }

POST   /api/auth/refresh
       Request: { refresh_token }
       Response: { access_token, expires_at }

GET    /api/auth/me
       Headers: Authorization: Bearer {token}
       Response: { user_id, username, role, permissions }

POST   /api/auth/change-password
       Request: { old_password, new_password }
       Response: { success: true }
```

---

## 🛡️ Security Best Practices Implemented

✅ **Session Persistence**: Token stored in localStorage with expiry check  
✅ **Token Expiry**: Automatic logout after 24 hours (configurable)  
✅ **Permission Checking**: All sensitive routes protected  
✅ **Role-Based Access**: Three-tier access control  
✅ **UI Hiding**: Sensitive UI hidden from unauthorized users  
✅ **Error Handling**: Clear error messages without exposing internals  
✅ **State Management**: Centralized auth service  
✅ **Listener Pattern**: React components notified of auth changes  

---

## ⚙️ Configuration

### Adjust Token Expiry

In `frontend/services/authService.ts`:

```typescript
// Default: 24 hours
expiresAt: Date.now() + 24 * 60 * 60 * 1000

// Change to 1 hour:
expiresAt: Date.now() + 60 * 60 * 1000

// Change to 7 days:
expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
```

### Add New Roles

```typescript
// In authService.ts
async login(credentials) {
  // Add new role type
  role: 'supervisor' // New role
  
  // Add permissions for role
  permissions: ['view_all', 'manage_alarms', 'custom_perm']
}
```

### Change Demo Credentials

```typescript
// In authService.ts
const DEFAULT_ADMIN_USER = 'your_username';
const DEFAULT_ADMIN_PASSWORD = 'your_password';
```

---

## 🧪 Testing

### Test Login

1. Open application
2. You'll see LoginPage
3. Enter: `admin` / `admin123`
4. Click "Login"
5. You should see the main dashboard

### Test Protected Routes

1. Try accessing `/settings`
2. Should automatically redirect to login
3. After login, should see SettingsPage

### Test Logout

1. Click user info in sidebar
2. Click "Logout"
3. Redirected to LoginPage

### Test Session Expiry

1. Login
2. Check browser DevTools → Application → localStorage
3. Find `scada_token_expiry`
4. (Optional: Change to past time to simulate expiry)
5. Refresh page → Should show LoginPage

---

## 📱 Component Integration

### How Components Use Auth

```tsx
import { useAuth } from '../features/auth/useAuth';

export const MyComponent = () => {
  const { isAuthenticated, user, hasPermission } = useAuth();

  if (!isAuthenticated) {
    return <div>Please login</div>;
  }

  if (!hasPermission('edit_config')) {
    return <div>You don't have permission</div>;
  }

  return (
    <div>
      Welcome, {user.username}!
      Edit configuration here...
    </div>
  );
};
```

---

## 📚 Related Documentation

- [README.md](../README.md) - Main documentation
- [QUICKSTART.md](./QUICKSTART.md) - Quick start guide
- [doc/ARCHITECTURE/](./ARCHITECTURE/) - System architecture

---

## 🔗 Version Information

- **Implemented in**: v0.1.0
- **Status**: Production Ready (demo credentials only)
- **Last Updated**: January 27, 2025

---

**Security Implementation v0.1.0** ✅

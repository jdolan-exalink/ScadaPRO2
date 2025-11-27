# ⚡ Quick Reference - Authentication & Security

One-page reference for developers working with SCADA Pro authentication system.

---

## 🔑 Login Flow (Developer View)

```
┌─────────────────────────────────────────────────────┐
│ 1. User visits /                                    │
│    App.tsx checks: isAuthenticated()                │
└────────────────────┬────────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
    FALSE ◄─────┐            ┌──► TRUE
        │       │            │    │
        ▼       │            │    ▼
    LoginPage   │            │   Dashboard
        │       │            │    │
        └───────┼────────────┘    │
                │                 │
            Login Attempt         │
                │                 │
            Success?              │
         ┌──────┴──────┐          │
        YES             NO        │
         │               │        │
         ▼               ▼        │
      Token +        Error       │
      Redirect        Message    │
         │               │        │
         └───────┬───────┘        │
                 │                │
             Dashboard ◄──────────┘
```

---

## 📝 Demo Credentials

```
┌──────────────┬──────────────┬──────────────────────┐
│  Username    │  Password    │  Role                │
├──────────────┼──────────────┼──────────────────────┤
│  admin       │  admin123    │  admin (full access) │
└──────────────┴──────────────┴──────────────────────┘
```

---

## 🎯 Key Components

### authService
```typescript
// Import
import authService from '../services/authService';

// Methods
await authService.login(credentials)        // Login
authService.logout()                         // Logout
authService.isAuthenticated()                // Check auth
authService.getCurrentUser()                 // Get user
authService.hasPermission(permission)        // Check permission
authService.hasRole(role)                    // Check role
authService.getToken()                       // Get token
```

### useAuth Hook
```typescript
// Import
import { useAuth } from '../features/auth/useAuth';

// Usage
const { 
  isAuthenticated,    // boolean
  user,               // AuthUser | null
  token,              // string | null
  loading,            // boolean
  error,              // string | null
  
  login,              // async function
  logout,             // function
  hasPermission,      // function(permission)
  hasRole             // function(role)
} = useAuth();
```

### ProtectedRoute
```tsx
// Basic usage
<ProtectedRoute requiredPermission="edit_config">
  <SettingsPage />
</ProtectedRoute>

// With role
<ProtectedRoute requiredRole="admin">
  <AdminPanel />
</ProtectedRoute>

// UI Component
<ProtectedSection permission="edit_config">
  <button>Edit Configuration</button>
</ProtectedSection>

// Hook
const canEdit = useCanAccess("edit_config");
```

---

## 🔓 Roles & Permissions

### Admin
```
✅ view_all
✅ edit_config
✅ manage_alarms
✅ manage_users
```

### Operator
```
✅ view_all
✅ manage_alarms
❌ edit_config
❌ manage_users
```

### Viewer
```
✅ view_all
❌ manage_alarms
❌ edit_config
❌ manage_users
```

---

## 📂 File Locations

```
frontend/
├── services/
│   └── authService.ts           ← Core auth logic
├── features/
│   └── auth/
│       ├── LoginPage.tsx         ← Login UI
│       ├── useAuth.ts            ← React hook
│       ├── ProtectedRoute.tsx    ← Route protection
│       └── authService.test.ts   ← Tests
├── components/
│   └── Layout.tsx                ← Version + user info
├── version.ts                    ← Version info
└── App.tsx                       ← Auth routing
```

---

## 🏗️ Component Integration

### In a Component
```tsx
import { useAuth } from '../features/auth/useAuth';

export const MyComponent = () => {
  const { isAuthenticated, user, hasPermission, logout } = useAuth();

  if (!isAuthenticated) return <div>Please login</div>;
  if (!hasPermission('edit_config')) return <div>No access</div>;

  return (
    <div>
      Welcome {user.username}!
      <button onClick={logout}>Logout</button>
    </div>
  );
};
```

### In a Route
```tsx
import { ProtectedRoute } from '../features/auth/ProtectedRoute';

export const AppRoutes = () => (
  <Routes>
    <Route path="/" element={<Dashboard />} />
    <Route 
      path="/settings" 
      element={
        <ProtectedRoute requiredPermission="edit_config">
          <SettingsPage />
        </ProtectedRoute>
      } 
    />
  </Routes>
);
```

---

## 💾 localStorage Keys

```javascript
// Token and expiry
localStorage.getItem('scada_token')           // Auth token
localStorage.getItem('scada_token_expiry')    // Expiry time (ms)

// User info
localStorage.getItem('scada_user')            // User JSON object

// Clear session
localStorage.clear()                          // Clear all
localStorage.removeItem('scada_token')        // Clear token only
```

---

## ⏱️ Token Management

```javascript
// Token expires in 24 hours
expiresAt = Date.now() + 24 * 60 * 60 * 1000

// Check if expired
if (Date.now() > expiresAt) {
  // Token is expired
  authService.logout();
  redirectToLogin();
}

// Refresh token (extend session)
await authService.refreshToken()  // Extends by 24 hours
```

---

## 🧪 Testing

### Run Tests
```bash
npm run test                           # Run all tests
npm run test -- authService.test.ts   # Run specific test
npm run test -- --watch               # Watch mode
npm run test -- --coverage            # With coverage
```

### Quick Manual Test
```bash
npm run dev
# 1. See LoginPage
# 2. Enter: admin / admin123
# 3. See dashboard
# 4. Check user info in sidebar
# 5. Click logout
# 6. Back to LoginPage
```

---

## 🔧 Common Tasks

### Add New Permission
1. Edit `authService.ts`
2. Add permission to user's permissions array
3. Use in component: `hasPermission('new_permission')`

### Add New Role
1. Edit `authService.ts`
2. Add role case in login logic
3. Define permissions for role
4. Use in component: `hasRole('new_role')`

### Protect a Route
```tsx
<ProtectedRoute requiredPermission="permission_name">
  <Component />
</ProtectedRoute>
```

### Protect a UI Element
```tsx
<ProtectedSection permission="permission_name">
  <Button />
</ProtectedSection>
```

### Check Permission in Component
```tsx
const canAccess = hasPermission('permission_name');
if (canAccess) {
  // Show restricted content
}
```

---

## 🚀 Production Checklist

- [ ] Remove demo credentials
- [ ] Integrate with real backend auth
- [ ] Change token expiry time if needed
- [ ] Add password policy enforcement
- [ ] Add user management UI
- [ ] Enable HTTPS only
- [ ] Use httpOnly cookies (not localStorage)
- [ ] Add audit logging
- [ ] Test with real users
- [ ] Set up monitoring

---

## 🐛 Debug Commands

### Log Current User
```typescript
import authService from '../services/authService';
console.log(authService.getCurrentUser());
```

### Check Token
```typescript
console.log(localStorage.getItem('scada_token'));
console.log(localStorage.getItem('scada_token_expiry'));
```

### Force Logout
```typescript
import authService from '../services/authService';
authService.logout();
```

### Simulate Token Expiry
```javascript
localStorage.setItem('scada_token_expiry', '1609459200000'); // Past time
location.reload(); // Refresh
```

---

## 📞 Related Docs

- [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md) - Full security guide
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Detailed testing procedures
- [CHANGELOG.md](../CHANGELOG.md) - What's new in v0.1.0

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Not staying logged in | Check localStorage is enabled |
| Protected route not working | Check ProtectedRoute wraps component |
| Permission not working | Check user has permission in token |
| Tests failing | Run `npm install`, check Node.js v16+ |
| Token not in localStorage | Check login was successful |

---

**Quick Reference v0.1.0** ⚡

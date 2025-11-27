# 🧪 Testing Guide - Authentication System

Complete guide for testing the authentication system and security features in SCADA Pro v0.1.0.

---

## 🏃 Quick Test (Manual)

### 1. Start the Application

```bash
cd frontend
npm install
npm run dev
```

The app opens at `http://localhost:5173`

### 2. See LoginPage

You should see the login page with:
- SCADA Pro logo
- Username field
- Password field with show/hide toggle
- Login button
- Demo credentials info

### 3. Login with Demo Credentials

```
Username: admin
Password: admin123
```

### 4. Verify Authentication Works

After login you should see:
- ✅ Main dashboard
- ✅ User info in sidebar (username: "admin", role: "admin")
- ✅ Logout button in sidebar
- ✅ Version display (v0.1.0) under logo
- ✅ All navigation links active

### 5. Test Protected Routes

Try accessing different pages:

| URL | Permission Required | Result |
|-----|-------------------|--------|
| `/` | `view_all` | ✅ Allowed |
| `/settings` | `edit_config` | ✅ Allowed (admin has it) |
| `/boards` | `view_all` | ✅ Allowed |
| `/inventory` | `view_all` | ✅ Allowed |

### 6. Test Logout

1. Click the user info in the sidebar
2. Click "Logout"
3. Should return to LoginPage
4. Refresh page → Should show LoginPage
5. Try accessing `/settings` → Should redirect to LoginPage

### 7. Test Session Persistence

1. Login with admin/admin123
2. Refresh the page (F5 or Cmd+R)
3. ✅ Should stay logged in (session persisted)
4. Check browser DevTools → Application → Storage → localStorage
5. Look for:
   - `scada_user` - Current user info
   - `scada_token` - Authentication token
   - `scada_token_expiry` - Token expiry time

---

## 🧬 Unit Tests (Automated)

### Setup

```bash
# Install dependencies (if not done)
cd frontend
npm install

# Install testing dependencies
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom
```

### Run Tests

```bash
# Run all tests
npm run test

# Run auth tests only
npm run test -- authService.test.ts

# Run with coverage
npm run test -- --coverage

# Run in watch mode (re-run on file change)
npm run test -- --watch
```

### Test File Location

```
frontend/features/auth/authService.test.ts
```

### Tests Included

The test suite includes:

**✅ Login Tests** (3 tests)
- Valid credentials authentication
- Invalid credentials rejection
- Token storage in localStorage

**✅ Authentication Status Tests** (4 tests)
- isAuthenticated when logged out
- isAuthenticated when logged in
- getCurrentUser when logged out
- getCurrentUser after login

**✅ Permission Tests** (4 tests)
- hasPermission for admin
- hasPermission for non-existent permission
- hasRole for admin
- hasRole for other roles

**✅ Logout Tests** (3 tests)
- Authentication cleared after logout
- Token removed from localStorage
- User set to null after logout

**✅ Session Persistence Tests** (1 test)
- Restore session from localStorage

**✅ Token Expiry Tests** (2 tests)
- Expired token considered invalid
- Valid token considered authenticated

**✅ Subscription Tests** (3 tests)
- Notify on login
- Notify on logout
- Don't notify after unsubscribe

**✅ Authorization Scenarios Tests** (3 tests)
- Admin has all permissions
- Admin can access all routes
- Protected routes require permissions

---

## 🔍 Manual Test Scenarios

### Scenario 1: Fresh User Login

**Steps:**
1. Clear browser cache/localStorage
2. Visit http://localhost:5173
3. You should see LoginPage

**Expected Result:**
```
✅ LoginPage displayed
✅ Username field empty
✅ Password field empty
✅ Login button present
✅ Demo credentials hint visible
```

---

### Scenario 2: Successful Login

**Steps:**
1. Enter `admin` in username field
2. Enter `admin123` in password field
3. Click Login button

**Expected Result:**
```
✅ Loading spinner appears briefly
❌ No error message
✅ Redirected to dashboard
✅ User info shows "admin" / "admin"
✅ Version v0.1.0 visible under logo
```

---

### Scenario 3: Login Error Handling

**Steps:**
1. Enter `admin` in username field
2. Enter `wrongpassword` in password field
3. Click Login button

**Expected Result:**
```
✅ Loading spinner appears
✅ Error message displays: "Invalid credentials"
✅ No redirect
✅ User can try again
```

---

### Scenario 4: Show/Hide Password

**Steps:**
1. Click password field
2. Type `admin123`
3. Password field shows dots (••••••••)
4. Click eye icon to show password
5. Password field shows `admin123`
6. Click eye icon to hide
7. Password field shows dots again

**Expected Result:**
```
✅ Password visibility toggles
✅ Input value preserves correctly
✅ Eye icon changes appearance
```

---

### Scenario 5: Protected Route Access

**Before Login:**
1. Try visiting http://localhost:5173/settings directly
2. Should redirect to LoginPage

**After Login:**
1. Login with admin/admin123
2. Visit http://localhost:5173/settings
3. Should display SettingsPage

**Expected Result:**
```
✅ Unauthenticated users redirected to login
✅ Authenticated users can access protected routes
✅ No error messages during redirect
```

---

### Scenario 6: Session Persistence

**Steps:**
1. Login with admin/admin123
2. Dashboard loads successfully
3. Press F5 to refresh page
4. Wait for page to fully load

**Expected Result:**
```
✅ No redirect to LoginPage
✅ Dashboard loads directly
✅ User info still shows "admin" / "admin"
✅ Version still visible
```

---

### Scenario 7: Token Expiry Simulation

**Steps:**
1. Login with admin/admin123
2. Open DevTools (F12)
3. Go to Application → Storage → localStorage
4. Find `scada_token_expiry` entry
5. Edit value to a past timestamp (e.g., `1609459200000`)
6. Refresh page (F5)

**Expected Result:**
```
✅ Redirected to LoginPage
✅ "Session expired" or similar message (optional)
✅ Must login again to access dashboard
```

---

### Scenario 8: Logout

**Steps:**
1. Login with admin/admin123
2. Dashboard loads
3. Look for user info in sidebar
4. Click on user info (admin / admin icon)
5. Click Logout button

**Expected Result:**
```
✅ Redirected to LoginPage
✅ localStorage cleared
✅ User info no longer visible
✅ Can login again
```

---

### Scenario 9: Multiple Tabs Sync

**Steps:**
1. Login in Tab 1
2. Open same URL in Tab 2
3. Tab 2 should detect logged-in session

**Expected Result:**
```
✅ Tab 2 shows dashboard (not LoginPage)
✅ User info visible in both tabs
✅ Logout in Tab 1 affects Tab 2 behavior
```

---

### Scenario 10: Permission Enforcement

**Admin User:**
1. Login as admin
2. Can access Settings (✅)
3. Can access Boards (✅)
4. Can manage everything (✅)

**Expected Result:**
```
✅ All routes accessible
✅ All UI elements visible
✅ Full system access
```

---

## 🐛 Debugging

### Enable Debug Logging

In `frontend/services/authService.ts`, add console logs:

```typescript
async login(credentials) {
  console.log('🔐 Login attempt:', credentials.username);
  
  // ... auth code ...
  
  console.log('✅ Login successful:', user);
  this.setUser(user);
  return user;
}
```

### Check localStorage

Open DevTools → Application → Storage → localStorage

Look for:
- `scada_user` - Current user JSON
- `scada_token` - Auth token string
- `scada_token_expiry` - Expiry timestamp

### Check Network Requests

In v0.1.0 (demo mode), no network requests are made.  
In production (v0.2.0+), check for:

```
POST /api/auth/login     ← Login request
POST /api/auth/logout    ← Logout request
GET  /api/auth/me        ← User info request
```

### React DevTools

Install [React DevTools](https://react-devtools-tutorial.vercel.app/)

Look for:
- `<AuthProvider>` wrapper
- `useAuth` hook state
- Props passed to ProtectedRoute

---

## ✅ Test Checklist

Use this checklist to verify all features:

### Authentication
- [ ] LoginPage displays when not authenticated
- [ ] Can login with admin/admin123
- [ ] Invalid credentials show error
- [ ] Session persists on page refresh
- [ ] Logout clears session

### UI/UX
- [ ] Password show/hide toggle works
- [ ] Error messages display correctly
- [ ] Loading spinner appears during login
- [ ] Demo credentials hint visible
- [ ] Version v0.1.0 visible under logo
- [ ] User info displays in sidebar
- [ ] Logout button present and clickable

### Authorization
- [ ] Protected routes redirect to login
- [ ] Admin can access all pages
- [ ] Permissions enforced correctly
- [ ] User role displays correctly

### Data Persistence
- [ ] localStorage stores token
- [ ] localStorage stores user info
- [ ] localStorage cleared on logout
- [ ] Session survives page refresh
- [ ] Token expiry works correctly

### Error Handling
- [ ] Invalid username handled
- [ ] Invalid password handled
- [ ] Network errors handled (future)
- [ ] Expired token handled
- [ ] Missing credentials handled

---

## 🚀 Performance Testing

### Load Test

```bash
# Time login process
time npm run dev

# Then manually login and measure:
# 1. Time to LoginPage display
# 2. Time to login completion
# 3. Time to dashboard render
```

### Memory Leak Check

Using Chrome DevTools:
1. Open DevTools → Memory tab
2. Take heap snapshot before login
3. Login
4. Take heap snapshot after login
5. Logout
6. Take heap snapshot after logout
7. Compare snapshots (should return to baseline)

---

## 📊 Test Coverage

Current test coverage target: **80%+**

Run coverage report:

```bash
npm run test -- --coverage
```

Expected output:
```
authService.ts:   85%+ coverage
ProtectedRoute:   80%+ coverage
useAuth.ts:       85%+ coverage
LoginPage.tsx:    75%+ coverage (UI tests harder)
```

---

## 🔐 Security Testing

### Test Cases

**1. XSS Prevention**
- Try entering `<script>alert('xss')</script>` as username
- Should be safely escaped or sanitized

**2. SQL Injection (if using backend)**
- Try entering `' OR '1'='1` as credentials
- Should fail gracefully

**3. CSRF Protection (future)**
- Check for CSRF tokens in POST requests
- Validate origin headers

**4. Token Hijacking Prevention**
- Tokens stored in localStorage (review: consider switching to httpOnly cookies)
- Tokens include expiry
- Invalid tokens rejected

---

## 📚 Test Documentation

- [authService.test.ts](./authService.test.ts) - Unit tests
- [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md) - Security guide
- [CHANGELOG.md](../../CHANGELOG.md) - Version history

---

## 🆘 Troubleshooting

### Issue: LoginPage not appearing

**Solution:**
1. Check `App.tsx` has auth context wrapper
2. Check `useAuth()` hook is returning `isAuthenticated: false`
3. Clear browser cache
4. Check console for errors

### Issue: Session not persisting

**Solution:**
1. Check localStorage is enabled in browser
2. Check `scada_token` exists in localStorage
3. Check token expiry time is in future
4. Check authService.login() is being called

### Issue: Protected routes not working

**Solution:**
1. Check ProtectedRoute component is wrapping the route
2. Check permission/role requirements are set
3. Check user has required permission
4. Check console for permission check results

### Issue: Tests failing

**Solution:**
1. Run `npm install` to ensure dependencies
2. Check Node.js version (need 16+)
3. Check Vitest is installed
4. Run `npm run test -- --reporter=verbose`
5. Check localStorage is cleared between tests

---

## 📞 Support

For issues or questions:
1. Check [SECURITY_IMPLEMENTATION.md](./SECURITY_IMPLEMENTATION.md)
2. Check console errors (F12)
3. Review test files for usage examples
4. Check backend API documentation

---

**Testing Guide v0.1.0** ✅

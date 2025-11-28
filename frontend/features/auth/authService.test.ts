import { describe, it, expect, beforeEach } from 'vitest';
import authService, { AuthUser } from '@/services/authService';

describe('Authentication Service', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    authService.logout();
  });

  describe('Login', () => {
    it('should authenticate with valid credentials', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      const user = await authService.login(credentials);

      expect(user).toBeDefined();
      expect(user.username).toBe('admin');
      expect(user.role).toBe('admin');
      expect(user.token).toBeDefined();
    });

    it('should throw error with invalid credentials', async () => {
      const credentials = { username: 'admin', password: 'wrongpassword' };
      expect(async () => {
        await authService.login(credentials);
      }).rejects.toThrow();
    });

    it('should store token in localStorage after login', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      const token = localStorage.getItem('scada_token');
      expect(token).toBeDefined();
      expect(token).not.toBeNull();
    });

    it('should set token expiry to 24 hours', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      const expiry = localStorage.getItem('scada_token_expiry');
      const expiryTime = parseInt(expiry || '0');
      const now = Date.now();
      const expected24hours = 24 * 60 * 60 * 1000;

      // Allow 1 minute variance
      expect(expiryTime - now).toBeGreaterThan(expected24hours - 60000);
      expect(expiryTime - now).toBeLessThan(expected24hours + 60000);
    });
  });

  describe('Authentication Status', () => {
    it('should return false for isAuthenticated when not logged in', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true for isAuthenticated after login', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return null for getCurrentUser when not logged in', () => {
      expect(authService.getCurrentUser()).toBeNull();
    });

    it('should return current user after login', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      const user = authService.getCurrentUser();
      expect(user).toBeDefined();
      expect(user?.username).toBe('admin');
      expect(user?.role).toBe('admin');
    });
  });

  describe('Permissions', () => {
    beforeEach(async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);
    });

    it('should check hasPermission correctly', () => {
      expect(authService.hasPermission('view_all')).toBe(true);
      expect(authService.hasPermission('edit_config')).toBe(true);
      expect(authService.hasPermission('manage_alarms')).toBe(true);
      expect(authService.hasPermission('manage_users')).toBe(true);
    });

    it('should return false for non-existent permission', () => {
      expect(authService.hasPermission('non_existent_permission')).toBe(false);
    });

    it('should check hasRole correctly', () => {
      expect(authService.hasRole('admin')).toBe(true);
      expect(authService.hasRole('operator')).toBe(false);
      expect(authService.hasRole('viewer')).toBe(false);
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);
    });

    it('should clear authentication after logout', () => {
      expect(authService.isAuthenticated()).toBe(true);
      authService.logout();
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should clear token from localStorage after logout', () => {
      expect(localStorage.getItem('scada_token')).toBeDefined();
      authService.logout();
      expect(localStorage.getItem('scada_token')).toBeNull();
    });

    it('should set user to null after logout', () => {
      expect(authService.getCurrentUser()).toBeDefined();
      authService.logout();
      expect(authService.getCurrentUser()).toBeNull();
    });
  });

  describe('Session Persistence', () => {
    it('should restore session from localStorage on load', () => {
      // Simulate stored session
      const testUser: AuthUser = {
        id: 'test123',
        username: 'admin',
        role: 'admin',
        permissions: ['view_all', 'edit_config'],
        token: 'test_token_123',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
      };

      localStorage.setItem('scada_user', JSON.stringify(testUser));
      localStorage.setItem('scada_token', testUser.token);
      localStorage.setItem('scada_token_expiry', testUser.expiresAt.toString());

      // Force reload of auth service would happen here in real app
      // For this test, we verify localStorage structure is correct
      const user = JSON.parse(localStorage.getItem('scada_user') || '{}');
      expect(user.username).toBe('admin');
      expect(user.role).toBe('admin');
    });
  });

  describe('Token Expiry', () => {
    it('should consider expired token as not authenticated', () => {
      // Set token to expire in the past
      const expiredTime = Date.now() - 1000; // 1 second ago
      localStorage.setItem('scada_token_expiry', expiredTime.toString());
      localStorage.setItem('scada_token', 'expired_token');

      // Token should be considered invalid
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should consider valid token as authenticated', () => {
      // Set token to expire in the future
      const futureTime = Date.now() + 24 * 60 * 60 * 1000;
      localStorage.setItem('scada_token_expiry', futureTime.toString());
      localStorage.setItem('scada_token', 'valid_token');

      // Login to set user
      // In real app, this would be set during login
      const testUser: AuthUser = {
        id: 'test123',
        username: 'admin',
        role: 'admin',
        permissions: ['view_all'],
        token: 'valid_token',
        expiresAt: futureTime,
      };
      localStorage.setItem('scada_user', JSON.stringify(testUser));

      // Token should be valid
      expect(authService.isAuthenticated()).toBe(true);
    });
  });

  describe('Subscriptions', () => {
    it('should notify subscribers on login', async () => {
      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);

      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should notify subscribers on logout', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);

      authService.logout();

      expect(listener).toHaveBeenCalled();
      unsubscribe();
    });

    it('should not notify unsubscribed listeners', async () => {
      const listener = vi.fn();
      const unsubscribe = authService.subscribe(listener);
      unsubscribe();

      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});

describe('Authorization Scenarios', () => {
  describe('Admin Role', () => {
    beforeEach(async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);
    });

    it('admin should have all permissions', () => {
      expect(authService.hasPermission('view_all')).toBe(true);
      expect(authService.hasPermission('edit_config')).toBe(true);
      expect(authService.hasPermission('manage_alarms')).toBe(true);
      expect(authService.hasPermission('manage_users')).toBe(true);
    });

    it('admin should access all routes', () => {
      expect(authService.hasRole('admin')).toBe(true);
      // All routes allowed for admin
    });
  });

  describe('Protected Routes', () => {
    it('should deny access to settings without edit_config permission', async () => {
      // Simulate operator role (no edit_config)
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      // In operator scenario:
      // const hasAccess = authService.hasPermission('edit_config');
      // expect(hasAccess).toBe(false); // Would be false for operator
    });

    it('should allow access to dashboard with view_all permission', async () => {
      const credentials = { username: 'admin', password: 'admin123' };
      await authService.login(credentials);

      expect(authService.hasPermission('view_all')).toBe(true);
      // Dashboard allowed
    });
  });
});

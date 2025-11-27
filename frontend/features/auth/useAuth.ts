import { useState, useEffect, useCallback } from 'react';
import { authService, AuthState, AuthUser } from '../services/authService';

export const useAuth = () => {
  const [state, setState] = useState<AuthState>(authService.getState());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to auth state changes
  useEffect(() => {
    const unsubscribe = authService.subscribe((newState) => {
      setState(newState);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const user = await authService.login({ username, password });
      return user;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Login failed';
      setError(errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setError(null);
  }, []);

  const refreshToken = useCallback(async () => {
    try {
      await authService.refreshToken();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Refresh failed';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const changePassword = useCallback(
    async (oldPassword: string, newPassword: string) => {
      try {
        await authService.changePassword(oldPassword, newPassword);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Change password failed';
        setError(errorMsg);
        throw err;
      }
    },
    []
  );

  const hasPermission = useCallback((permission: string): boolean => {
    return authService.hasPermission(permission);
  }, []);

  const hasRole = useCallback((role: 'admin' | 'operator' | 'viewer'): boolean => {
    return authService.hasRole(role);
  }, []);

  return {
    // State
    isAuthenticated: state.isAuthenticated,
    user: state.user as AuthUser | null,
    token: state.token,
    loading,
    error,

    // Methods
    login,
    logout,
    refreshToken,
    changePassword,
    hasPermission,
    hasRole,
  };
};

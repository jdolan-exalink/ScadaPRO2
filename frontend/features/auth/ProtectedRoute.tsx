import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { LoginPage } from './LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredRole?: 'admin' | 'operator' | 'viewer';
}

/**
 * ProtectedRoute component wraps routes that require authentication
 * 
 * Usage:
 * <ProtectedRoute requiredPermission="edit_config">
 *   <SettingsPage />
 * </ProtectedRoute>
 * 
 * or for role-based access:
 * <ProtectedRoute requiredRole="admin">
 *   <AdminPanel />
 * </ProtectedRoute>
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
}) => {
  const { isAuthenticated, hasPermission, hasRole } = useAuth();

  // Not authenticated - show login
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  // Check permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="min-h-screen bg-scada-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-400">You don't have permission to access this page.</p>
          <p className="text-sm text-slate-500 mt-2">Required: {requiredPermission}</p>
        </div>
      </div>
    );
  }

  // Check role
  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="min-h-screen bg-scada-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-400">Your role doesn't have access to this page.</p>
          <p className="text-sm text-slate-500 mt-2">Required role: {requiredRole}</p>
        </div>
      </div>
    );
  }

  // All checks passed
  return <>{children}</>;
};

/**
 * ProtectedSection component wraps UI elements that should only show if user has permission
 */
export const ProtectedSection: React.FC<{
  children: React.ReactNode;
  permission?: string;
  role?: 'admin' | 'operator' | 'viewer';
  fallback?: React.ReactNode;
}> = ({ children, permission, role, fallback = null }) => {
  const { hasPermission, hasRole } = useAuth();

  const hasAccess = 
    (!permission || hasPermission(permission)) &&
    (!role || hasRole(role));

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * Hook to check if user has specific access
 */
export const useCanAccess = (
  permission?: string,
  role?: 'admin' | 'operator' | 'viewer'
): boolean => {
  const { hasPermission, hasRole } = useAuth();

  return (
    (!permission || hasPermission(permission)) &&
    (!role || hasRole(role))
  );
};

/**
 * Authentication Service
 * Manages user authentication, session tokens, and access control
 */

interface AuthCredentials {
  username: string;
  password: string;
}

interface AuthUser {
  id: string;
  username: string;
  role: 'admin' | 'operator' | 'viewer';
  permissions: string[];
  token: string;
  expiresAt: number;
}

interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  expiresAt: number | null;
}

const STORAGE_KEY = 'scada_auth_token';
const USER_STORAGE_KEY = 'scada_auth_user';
const TOKEN_EXPIRY_KEY = 'scada_token_expiry';
const DEFAULT_ADMIN_USER = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123'; // Default - should be changed on first login

class AuthService {
  private state: AuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    expiresAt: null,
  };

  private listeners: Set<(state: AuthState) => void> = new Set();

  constructor() {
    this.restoreSession();
  }

  /**
   * Login user with credentials
   * In production, this would call the backend API
   */
  async login(credentials: AuthCredentials): Promise<AuthUser> {
    try {
      // Mock authentication - in production, call backend
      // await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify(credentials) })
      
      if (credentials.username === DEFAULT_ADMIN_USER && 
          credentials.password === DEFAULT_ADMIN_PASSWORD) {
        
        const user: AuthUser = {
          id: '1',
          username: credentials.username,
          role: 'admin',
          permissions: ['view_all', 'edit_config', 'manage_alarms', 'manage_users'],
          token: this.generateToken(),
          expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        };

        this.setUser(user);
        return user;
      } else {
        throw new Error('Invalid username or password');
      }
    } catch (error) {
      throw new Error(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Logout current user
   */
  logout(): void {
    this.clearSession();
    this.notifyListeners();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (!this.state.token || !this.state.expiresAt) {
      return false;
    }
    
    // Check if token is expired
    if (Date.now() > this.state.expiresAt) {
      this.clearSession();
      return false;
    }
    
    return true;
  }

  /**
   * Get current user
   */
  getCurrentUser(): AuthUser | null {
    if (this.isAuthenticated()) {
      return this.state.user;
    }
    return null;
  }

  /**
   * Get auth token
   */
  getToken(): string | null {
    if (this.isAuthenticated()) {
      return this.state.token;
    }
    return null;
  }

  /**
   * Check if user has specific permission
   */
  hasPermission(permission: string): boolean {
    if (!this.isAuthenticated() || !this.state.user) {
      return false;
    }
    return this.state.user.permissions.includes(permission);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: 'admin' | 'operator' | 'viewer'): boolean {
    if (!this.isAuthenticated() || !this.state.user) {
      return false;
    }
    return this.state.user.role === role;
  }

  /**
   * Get authentication state
   */
  getState(): AuthState {
    return { ...this.state };
  }

  /**
   * Subscribe to authentication state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Refresh token (extend session)
   */
  async refreshToken(): Promise<void> {
    if (!this.state.user) {
      throw new Error('No active session');
    }

    try {
      // In production: await fetch('/api/auth/refresh', { headers: { Authorization: `Bearer ${this.state.token}` } })
      const user = { ...this.state.user };
      user.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      this.setUser(user);
    } catch (error) {
      throw new Error(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Change user password (mock - should call backend)
   */
  async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.state.user) {
      throw new Error('Not authenticated');
    }

    try {
      // In production: await fetch('/api/auth/change-password', { ... })
      console.log('Password would be changed in production');
    } catch (error) {
      throw new Error(`Password change failed`);
    }
  }

  // Private methods

  private setUser(user: AuthUser): void {
    this.state.user = user;
    this.state.token = user.token;
    this.state.expiresAt = user.expiresAt;
    this.state.isAuthenticated = true;

    localStorage.setItem(STORAGE_KEY, user.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: user.permissions,
    }));
    localStorage.setItem(TOKEN_EXPIRY_KEY, user.expiresAt.toString());

    this.notifyListeners();
  }

  private clearSession(): void {
    this.state = {
      isAuthenticated: false,
      user: null,
      token: null,
      expiresAt: null,
    };

    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  }

  private restoreSession(): void {
    const token = localStorage.getItem(STORAGE_KEY);
    const userStr = localStorage.getItem(USER_STORAGE_KEY);
    const expiryStr = localStorage.getItem(TOKEN_EXPIRY_KEY);

    if (token && userStr && expiryStr) {
      const expiry = parseInt(expiryStr);
      
      if (Date.now() < expiry) {
        const userData = JSON.parse(userStr);
        this.state = {
          isAuthenticated: true,
          user: {
            ...userData,
            token,
            expiresAt: expiry,
          },
          token,
          expiresAt: expiry,
        };
      } else {
        this.clearSession();
      }
    }
  }

  private generateToken(): string {
    return `token_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Listener error:', error);
      }
    });
  }
}

export const authService = new AuthService();
export type { AuthUser, AuthCredentials, AuthState };

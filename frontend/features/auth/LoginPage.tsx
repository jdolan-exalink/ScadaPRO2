import React, { useState } from 'react';
import { Lock, AlertCircle, Eye, EyeOff, LogIn } from 'lucide-react';
import { authService } from '@/services/authService';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const LoginPage: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await authService.login({ username, password });
      onLoginSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-scada-900 via-scada-800 to-black flex items-center justify-center p-4">
      {/* Background effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-scada-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
      </div>

      {/* Login card */}
      <div className="relative w-full max-w-md">
        <div className="bg-scada-800/80 backdrop-blur-xl border border-scada-700 rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-scada-700 to-scada-600 px-8 py-12 text-center border-b border-scada-600">
            <div className="flex justify-center mb-4">
              <div className="bg-scada-500 p-3 rounded-lg">
                <Lock size={40} className="text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">SCADA Pro</h1>
            <p className="text-scada-300 text-sm">Industrial IoT Dashboard</p>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="p-8 space-y-6">
            {/* Error message */}
            {error && (
              <div className="flex items-center gap-3 p-4 bg-red-950/50 border border-red-500/50 rounded-lg">
                <AlertCircle size={20} className="text-red-400 flex-shrink-0" />
                <span className="text-red-300 text-sm">{error}</span>
              </div>
            )}

            {/* Username field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-slate-300 mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                placeholder="admin"
                className="w-full px-4 py-3 bg-scada-900 border border-scada-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-scada-500 focus:ring-1 focus:ring-scada-500 transition-all disabled:opacity-50"
              />
              <p className="text-xs text-slate-500 mt-1">Default: admin</p>
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-scada-900 border border-scada-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-scada-500 focus:ring-1 focus:ring-scada-500 transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 disabled:opacity-50"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">Default: admin123</p>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full py-3 px-4 bg-gradient-to-r from-scada-500 to-scada-600 hover:from-scada-600 hover:to-scada-700 text-white font-bold rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Login</span>
                </>
              )}
            </button>

            {/* Info section */}
            <div className="pt-4 border-t border-scada-700">
              <p className="text-xs text-slate-400 text-center">
                This is a demo login. For production, integrate with your authentication system.
              </p>
            </div>
          </form>

          {/* Footer */}
          <div className="px-8 py-4 bg-scada-900/50 border-t border-scada-700 text-center text-xs text-slate-500">
            © 2025 SCADA Pro. All rights reserved.
          </div>
        </div>

        {/* Info box */}
        <div className="mt-6 p-4 bg-scada-800/50 border border-scada-700 rounded-lg text-sm text-slate-400">
          <p className="font-medium text-slate-300 mb-2">Demo Credentials:</p>
          <p>Username: <code className="bg-scada-900 px-2 py-1 rounded text-slate-300">admin</code></p>
          <p>Password: <code className="bg-scada-900 px-2 py-1 rounded text-slate-300">admin123</code></p>
        </div>
      </div>
    </div>
  );
};

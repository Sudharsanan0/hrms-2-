import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn, Building2 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter email and password.'); return; }
    setLoading(true);
    setError('');
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      // Navigation handled by AuthContext state change → SmartRedirect
      navigate('/', { replace: true });
    } else {
      setError(result.error || 'Invalid credentials. Please try again.');
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-modal">
      {/* Mobile logo */}
      <div className="flex lg:hidden items-center gap-3 mb-8">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-bold leading-tight">Clixhora HRMS</p>
          <p className="text-white/50 text-xs">Digital Marketing & Technology</p>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
      <p className="text-white/60 text-sm mb-7">Sign in to your account to continue</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
            Work Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="yourname@clixhora.com"
            autoComplete="email"
            className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm outline-none focus:border-white/50 focus:ring-2 focus:ring-white/10 transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">
            Password
          </label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 pr-10 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm outline-none focus:border-white/50 focus:ring-2 focus:ring-white/10 transition-all"
              required
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-rose-500/20 border border-rose-400/30 rounded-lg px-3 py-2 text-rose-200 text-xs">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white text-brand-700 font-bold py-2.5 rounded-lg text-sm hover:bg-white/90 active:bg-white/80 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        <div className="text-center">
          <Link to="/forgot-password" className="text-white/50 text-xs hover:text-white/80 transition-colors">
            Forgot your password?
          </Link>
        </div>
      </form>

      {/* Demo hint */}
      <div className="mt-6 pt-5 border-t border-white/10">
        <p className="text-white/40 text-xs text-center mb-3">Demo credentials</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => { setEmail('admin@clixhora.com'); setPassword('demo123'); }}
            className="text-xs bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            Admin login
          </button>
          <button
            type="button"
            onClick={() => { setEmail('emp@clixhora.com'); setPassword('demo123'); }}
            className="text-xs bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-white/60 hover:bg-white/10 hover:text-white transition-all"
          >
            Employee login
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSupabaseConfigured) {
        const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
      }
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
    }
    setLoading(false);
  };

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-modal">
      <h2 className="text-2xl font-bold text-white mb-1">Reset password</h2>
      <p className="text-white/60 text-sm mb-7">Enter your work email to receive a reset link</p>

      {sent ? (
        <div className="text-center py-4">
          <div className="w-14 h-14 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-7 h-7 text-white" />
          </div>
          <p className="text-white font-semibold mb-2">Check your inbox</p>
          <p className="text-white/60 text-sm">A password reset link has been sent to <strong>{email}</strong></p>
          <Link to="/login" className="block mt-6 text-white/60 hover:text-white text-sm">← Back to login</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white/70 mb-1.5 uppercase tracking-wide">Work Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="yourname@clixhora.com"
              className="w-full px-3.5 py-2.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/30 text-sm outline-none focus:border-white/50 transition-all"
              required
            />
          </div>
          {error && <p className="text-rose-300 text-xs">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-brand-700 font-bold py-2.5 rounded-lg text-sm hover:bg-white/90 transition-all disabled:opacity-60"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <Link to="/login" className="flex items-center justify-center gap-2 text-white/50 hover:text-white text-xs mt-2">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to login
          </Link>
        </form>
      )}
    </div>
  );
};

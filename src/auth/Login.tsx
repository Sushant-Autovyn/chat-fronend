import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Mail, Lock, AlertCircle, Eye, Shield, CheckCircle2, Globe } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (isAuthenticated && user) {
      navigate(user.role === 'admin' ? '/admin/dashboard' : '/agent/dashboard');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5fb] text-slate-950 px-3 py-8">
      <div className="mx-auto grid max-w-[980px] gap-0 overflow-hidden rounded-[1.75rem] bg-white shadow-[0_26px_60px_rgba(15,23,42,0.12)] lg:grid-cols-[1.02fr_0.98fr]">
        <section className="relative overflow-hidden bg-[#f8fafc] p-4 sm:p-6 lg:p-8">
          <div className="absolute inset-y-0 left-0 w-1/2 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.08),transparent_28%)]" />
          <div className="relative z-10 flex flex-col justify-between py-6 lg:py-8">
            <div className="space-y-6 max-w-lg">
              <div className="inline-flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm">
                <Shield className="h-4 w-4 text-indigo-600" />
                Enterprise Support Desk
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  One platform for smarter customer support
                </h1>
                <p className="max-w-lg text-sm leading-7 text-slate-600">
                  Streamline chat, manage agents, and deliver fast, personalized service with a unified support desk.
                </p>
              </div>

              <div className="grid gap-3">
                <div className="flex items-start gap-3 rounded-[1.75rem] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Secure agent access</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Centralized sign-in and permissions for every team member.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[1.75rem] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-600 text-white">
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Live chat visibility</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Monitor conversations and customer requests in real time.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[1.75rem] bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-600 text-white">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Faster ticket resolution</p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Help agents close requests quickly with centralized tools.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </section>

        <section className="flex items-center justify-center bg-white p-6 sm:p-8 lg:p-10">
          <div className="w-full max-w-lg rounded-[1.75rem] bg-white shadow-[0_34px_100px_rgba(15,23,42,0.08)]">
            <div className="p-8 sm:p-10">
              <div className="mb-8 flex flex-col gap-3 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 shadow-[0_20px_40px_rgba(99,102,241,0.15)]">
                  <Shield className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Welcome Back</h2>
                  <p className="mt-2 text-sm text-slate-500">Sign in to your account to continue</p>
                </div>
              </div>

              {error && (
                <div className="mb-6 rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="mt-0.5 h-5 w-5" />
                    <span>{error}</span>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading}
                    placeholder="Enter your email"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-12 py-4 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                </div>

                <label className="block text-sm font-medium text-slate-700">Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    placeholder="Enter your password"
                    className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-12 py-4 pr-16 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-500">
                    <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600" />
                    Remember me
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center rounded-3xl bg-indigo-600 px-5 py-4 text-sm font-semibold text-white shadow-[0_20px_50px_rgba(99,102,241,0.25)] transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? 'Signing in...' : 'Sign In to Dashboard'}
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;

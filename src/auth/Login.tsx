import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2, Globe, MessageSquare, ShieldCheck, Zap, Users } from 'lucide-react';

// Autovyn brand logo — colorful petals on dark background
const AutovynLogo: React.FC<{ size?: number }> = ({ size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="120" height="120" rx="20" fill="#0f1117" />
    {/* Top-left petal — blue */}
    <ellipse cx="42" cy="42" rx="18" ry="10" transform="rotate(-45 42 42)" fill="#2196F3" />
    <circle cx="35" cy="35" r="8" fill="#2196F3" />
    {/* Top-right petal — green */}
    <ellipse cx="78" cy="42" rx="18" ry="10" transform="rotate(45 78 42)" fill="#4CAF50" />
    <circle cx="85" cy="35" r="8" fill="#4CAF50" />
    {/* Bottom-left petal — orange */}
    <ellipse cx="42" cy="78" rx="18" ry="10" transform="rotate(45 42 78)" fill="#FF9800" />
    <circle cx="35" cy="85" r="8" fill="#FF9800" />
    {/* Bottom-right petal — pink/red */}
    <ellipse cx="78" cy="78" rx="18" ry="10" transform="rotate(-45 78 78)" fill="#E91E63" />
    <circle cx="85" cy="85" r="8" fill="#E91E63" />
    {/* Center connector */}
    <circle cx="60" cy="60" r="8" fill="#fff" opacity="0.15" />
  </svg>
);

// Sidebar brand mark — larger version for the top of login form
const AutovynMark: React.FC<{ large?: boolean }> = ({ large = false }) => (
  <div className="flex items-center gap-4">
    <AutovynLogo size={large ? 64 : 40} />
    <div>
      <div className={`font-extrabold tracking-widest text-white leading-none ${large ? 'text-[24px]' : 'text-[18px]'}`}>AUTOVYN</div>
      <div className="text-[11px] font-semibold text-orange-400 leading-none mt-0.5">Automating lives!</div>
    </div>
  </div>
);

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
    if (!email || !password) { setError('Please fill in all fields'); return; }
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
    <div className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(79,70,229,0.12) 0%, #0b0d12 55%), #0b0d12' }}>
      <div className="w-full max-w-[1040px] grid lg:grid-cols-[1fr_440px] gap-0 overflow-hidden rounded-xl border border-white/[0.07] shadow-[0_32px_80px_rgba(0,0,0,0.6)]">

        {/* Left panel — brand side */}
        <div className="hidden lg:flex flex-col justify-between relative overflow-hidden border-r border-white/[0.06] p-12"
          style={{ background: 'linear-gradient(135deg, #0d1017 0%, #111520 100%)' }}>

          {/* Subtle dot-grid pattern */}
          <div className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)',
              backgroundSize: '28px 28px'
            }}
          />
          {/* Top-left indigo glow */}
          <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)' }} />
          {/* Bottom-right glow */}
          <div className="pointer-events-none absolute -bottom-20 -right-10 w-56 h-56 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)' }} />

          <div className="relative z-10">
            <AutovynMark large={true} />

            <div className="mt-10 space-y-2">
              <h1 className="text-[28px] font-bold text-white leading-snug tracking-tight">
                Enterprise Support<br />Platform
              </h1>
              <p className="text-[13px] text-white/45 leading-relaxed max-w-xs mt-2">
                Centralized support desk for managing agents, live chats, and customer tickets at scale.
              </p>
            </div>

            {/* Feature list */}
            <div className="mt-10 space-y-3">
              {[
                { icon: ShieldCheck, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', text: 'Role-based access for admins and agents' },
                { icon: MessageSquare, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'Real-time chat monitoring & assignment' },
                { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', text: 'Instant notifications and live ticket routing' },
                { icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', text: 'Full conversation history and team analytics' },
              ].map(({ icon: Icon, color, bg, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${bg}`}>
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                  <span className="text-[12px] text-white/55">{text}</span>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="mt-10 grid grid-cols-3 gap-3">
              {[
                { value: '20K+', label: 'Daily Users' },
                { value: '99.9%', label: 'Uptime SLA' },
                { value: '<1s', label: 'Response' },
              ].map(({ value, label }) => (
                <div key={label} className="rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2.5 text-center">
                  <div className="text-[16px] font-bold text-indigo-300 leading-none">{value}</div>
                  <div className="text-[10px] text-white/35 mt-1 leading-none">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="relative z-10 mt-10 pt-5 border-t border-white/[0.06]">
            <p className="text-[10px] text-white/20">
              © {new Date().getFullYear()} Autovyn Consultancy Pvt. Ltd. — All rights reserved.
            </p>
          </div>
        </div>

        {/* Right panel — sign in form */}
        <div className="flex flex-col justify-center p-8 sm:p-10"
          style={{ background: 'linear-gradient(180deg, #13161c 0%, #0f1117 100%)' }}>
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <AutovynMark large={true} />
          </div>

          <div className="mb-8">
            <h2 className="text-[22px] font-bold text-white tracking-tight">Sign in</h2>
            <p className="text-[12px] text-white/40 mt-1">Enter your credentials to access the dashboard</p>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md border border-rose-500/30 bg-rose-500/10 px-3.5 py-3 text-[12px] text-rose-400">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  placeholder="you@autovyn.com"
                  className="w-full rounded-md border border-white/[0.1] bg-white/[0.05] pl-9 pr-4 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08] disabled:opacity-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-white/[0.1] bg-white/[0.05] pl-9 pr-10 py-2.5 text-[13px] text-white placeholder-white/25 outline-none transition focus:border-indigo-500 focus:bg-white/[0.08] disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-indigo-600 accent-indigo-600" />
                <span className="text-[12px] text-white/40">Remember me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-indigo-600 py-2.5 text-[13px] font-semibold text-white transition hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-8 text-[11px] text-white/20 text-center">
            Autovyn Consultancy Pvt. Ltd. · Enterprise Support Platform
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

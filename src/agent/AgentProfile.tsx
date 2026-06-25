import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { agentService, logActivity } from '../services/api';
import { User, ShieldCheck, Mail, Shield, Building, AlertCircle, Sparkles } from 'lucide-react';

const AgentProfile: React.FC = () => {
  const { user } = useAuth();

  // States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dept, setDept] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    const loadAgent = async () => {
      if (!user) return;

      try {
        const agentList = await agentService.fetchAgents();
        const record = agentList.find(a => a.id === user.userId);

        setName(user.name);
        setEmail(user.email);

        if (record) {
          setDept(record.department);
          setRole(record.role);
          setStatus(record.status);
        }
      } catch (err) {
        console.error('Failed to load agent profile:', err);
      }
    };

    loadAgent();
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!name || !email) {
      setError('Name and Email are required.');
      return;
    }

    try {
      if (user) {
        await agentService.updateAgent(user.userId, { name, email });

        // Update user session in localStorage
        const storedUser = localStorage.getItem('enterprise_auth_user');
        if (storedUser) {
          const session = JSON.parse(storedUser);
          session.name = name;
          session.email = email;
          localStorage.setItem('enterprise_auth_user', JSON.stringify(session));
        }

        logActivity(`Agent ${name} updated their profile info`, name, 'agent');
        setSuccess('Profile updated successfully! Some changes may take effect upon next login.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update profile.');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    try {
      if (user) {
        const agentList = await agentService.fetchAgents();
        const record = agentList.find((a) => a.id === user.userId);

        if (!record) {
          throw new Error('Agent record not found.');
        }

        const currentPasswordValid = record.password
          ? currentPassword === record.password
          : (record.role === 'admin' && currentPassword === 'admin123') ||
            (record.role === 'agent' && currentPassword === 'agent123') ||
            currentPassword === 'password';

        if (!currentPasswordValid) {
          setError('Current password is incorrect.');
          return;
        }

        await agentService.updateAgent(user.userId, { password: newPassword });
        logActivity(`Agent ${name} successfully updated their account password`, name, 'agent');
        setSuccess('Account password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to change password.');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header section */}
      <div>
        <h1 className="text-xl font-bold text-foreground">My Profile Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          View your staff records, update your personal info, or change your dashboard security credentials.
        </p>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm animate-fade-in flex items-center gap-2">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Profile Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Staff Card */}
        <div className="md:col-span-1 rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col items-center text-center justify-between h-80">
          <div className="space-y-4">
            <div className="relative inline-block">
              <div className="h-20 w-20 rounded-full bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-extrabold text-2xl">
                {user?.name.substring(0, 2).toUpperCase()}
              </div>
              <span className="absolute bottom-0 right-0 h-4.5 w-4.5 rounded-full bg-emerald-500 border-2 border-card" title="Online" />
            </div>

            <div>
              <h3 className="text-base font-bold text-foreground font-sans leading-tight">{user?.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 font-medium">{user?.email}</p>
            </div>
          </div>

          <div className="w-full border-t border-border/60 pt-4 space-y-2 text-left text-xs font-semibold text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building className="h-4 w-4 text-muted-foreground/80" />
              <span>Dept: <b className="text-foreground">{dept}</b></span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground/80" />
              <span>System Role: <b className="text-foreground capitalize">{role}</b></span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-muted-foreground/80" />
              <span>Account Status: <b className="text-emerald-500 capitalize">{status}</b></span>
            </div>
          </div>
        </div>

        {/* Right Column: Editing forms */}
        <div className="md:col-span-2 space-y-6">
          {/* General info */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-4.5 w-4.5 text-primary" />
              <span>Personal Information</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
                >
                  Update Profile Details
                </button>
              </div>
            </form>
          </div>

          {/* Password change */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h3 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Sparkles className="h-4.5 w-4.5 text-primary" />
              <span>Change Security Password</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-primary text-white font-semibold text-xs rounded-xl hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
                >
                  Change Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentProfile;

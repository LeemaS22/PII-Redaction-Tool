import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Mail, Key, LogOut, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  const getInitials = (name) => {
    if (!name) return 'RX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-bold tracking-tight text-slate-100">
          Account & Security Settings
        </h2>
        <p className="text-xs text-slate-400">
          Manage your RedactX user profile and authentication credentials.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Profile Card */}
        <div className="rounded-2xl border border-slate-800/90 bg-[#111726] p-6 shadow-xl lg:col-span-2">
          <div className="flex items-center gap-4 border-b border-slate-800/80 pb-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 font-mono text-xl font-bold text-sky-300 shadow-md">
              {getInitials(user?.name)}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-100">{user?.name}</h3>
              <p className="text-xs text-slate-400">{user?.email}</p>
              <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-400">
                <CheckCircle className="h-3 w-3" />
                <span>Authenticated User</span>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Full Name
              </label>
              <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#090D16] px-3.5 py-2.5 text-sm text-slate-200">
                <User className="h-4 w-4 text-slate-500" />
                <span>{user?.name}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#090D16] px-3.5 py-2.5 text-sm text-slate-200">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>{user?.email}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                User ID
              </label>
              <div className="mt-1.5 flex items-center gap-2.5 rounded-xl border border-slate-800 bg-[#090D16] px-3.5 py-2.5 font-mono text-xs text-slate-400">
                <Key className="h-4 w-4 text-slate-500" />
                <span className="select-all">{user?.id}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Logout Card */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-800/90 bg-[#111726] p-6 shadow-xl">
          <div className="space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-400">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">Session Security</h4>
                <p className="text-[11px] text-slate-400">JWT-based active session</p>
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Your session is secured using bcrypt password hashing and JSON Web Tokens. Document ownership is enforced at the database level.
            </p>
          </div>

          <div className="mt-6 border-t border-slate-800/80 pt-6">
            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300 transition-colors hover:border-rose-500/50 hover:bg-rose-500/20"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out of Account</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

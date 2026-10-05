import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ScanLine,
  FileStack,
  BarChart3,
  History,
  Settings,
  Shield,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NAVIGATION_ITEMS = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Scan Document',
    path: '/scan',
    icon: ScanLine,
  },
  {
    name: 'Documents',
    path: '/documents',
    icon: FileStack,
  },
  {
    name: 'Reports',
    path: '/reports',
    icon: BarChart3,
  },
  {
    name: 'History',
    path: '/history',
    icon: History,
  },
  {
    name: 'Settings',
    path: '/settings',
    icon: Settings,
  },
];

export default function Sidebar({ isMobileOpen, onCloseMobile }) {
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
    <>
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Primary Sidebar Navigation"
        className={`fixed top-0 left-0 z-40 flex h-screen w-64 flex-col border-r border-slate-800/80 bg-[#0B0F19] transition-transform duration-200 ease-out lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="flex h-20 items-center gap-3 border-b border-slate-800/80 px-6">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-400">
            <Shield className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="text-base font-bold tracking-tight text-slate-100">
              REDACTX
            </div>
            <div className="truncate text-xs text-slate-400">
              Document Privacy Platform
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <div className="mb-2 px-3 text-[11px] font-medium text-slate-500">
            Platform Navigation
          </div>
          <nav className="space-y-1" aria-label="Main Navigation">
            {NAVIGATION_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => {
                    if (onCloseMobile) onCloseMobile();
                  }}
                  className={({ isActive }) =>
                    `group flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'border border-sky-500/25 bg-sky-500/10 text-sky-300'
                        : 'border border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span className="flex items-center gap-3 truncate">
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-sky-400'
                              : 'text-slate-500 group-hover:text-slate-300'
                          }`}
                        />
                        <span className="truncate whitespace-nowrap">
                          {item.name}
                        </span>
                      </span>
                      {isActive && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-sky-400"
                          aria-hidden="true"
                        />
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile Section */}
        <div className="border-t border-slate-800/80 p-4">
          <div className="flex w-full items-center justify-between rounded-xl border border-slate-800/90 bg-slate-900/60 p-3 text-left">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800 font-mono text-xs font-semibold text-sky-300">
                {getInitials(user?.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-100">
                  {user?.name || 'User'}
                </div>
                <div className="truncate text-xs text-slate-400">
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              title="Sign Out"
              className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

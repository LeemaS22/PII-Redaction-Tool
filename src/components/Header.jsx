import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Bell,
  User,
  Menu,
  ScanLine,
  CheckCircle2,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  MOCK_NOTIFICATIONS,
} from '../data/mockDashboardData';

const ROUTE_META = {
  '/dashboard': {
    title: 'Dashboard',
    subtitle: 'Monitor document protection and privacy activity.',
  },
  '/scan': {
    title: 'Scan Document',
    subtitle: 'Upload a document or image to detect and protect sensitive information.',
  },
  '/scan/results': {
    title: 'Scan Results',
    subtitle: 'Review document ingestion and scan status.',
  },
  '/documents': {
    title: 'Documents',
    subtitle: 'Manage processed files and redacted document archives.',
  },
  '/reports': {
    title: 'Reports',
    subtitle: 'Export compliance summaries and privacy posture metrics.',
  },
  '/history': {
    title: 'History',
    subtitle: 'Review chronological document processing events.',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Manage user account and session security preferences.',
  },
};

export default function Header({ onOpenMobileSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const currentMeta = ROUTE_META[location.pathname] || ROUTE_META['/dashboard'];

  const getInitials = (name) => {
    if (!name) return 'RX';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  useEffect(() => {
    function handleClickOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-slate-800/80 bg-[#090D16]/90 px-6 backdrop-blur-md lg:px-8">
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-white lg:hidden"
          aria-label="Open navigation sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight text-slate-100">
            {currentMeta.title}
          </h1>
          <p className="hidden truncate text-xs text-slate-400 sm:block">
            {currentMeta.subtitle}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {location.pathname !== '/scan' && (
          <button
            type="button"
            onClick={() => navigate('/scan')}
            className="hidden items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-sky-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400 sm:inline-flex whitespace-nowrap"
          >
            <ScanLine className="h-4 w-4" />
            <span>Scan New Document</span>
          </button>
        )}

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => {
              setShowNotifications((prev) => !prev);
              setShowProfileMenu(false);
            }}
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-[#111726] text-slate-300 transition-colors hover:border-slate-700 hover:text-slate-100"
            aria-label="View notifications"
            aria-expanded={showNotifications}
          >
            <Bell className="h-4 w-4" />
            <span
              className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-sky-400"
              aria-hidden="true"
            />
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-[#111726] p-4 shadow-xl">
              <div className="mb-3 flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <span className="text-xs font-semibold text-slate-200">
                  Notifications
                </span>
                <span className="text-[11px] text-slate-400">
                  Phase 1 Preview
                </span>
              </div>
              <div className="space-y-3">
                {MOCK_NOTIFICATIONS.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-2.5 text-xs"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-200">{item.title}</p>
                      <p className="mt-0.5 text-slate-400">
                        {item.description}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-slate-500">
                        {item.time}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Button */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => {
              setShowProfileMenu((prev) => !prev);
              setShowNotifications(false);
            }}
            className="inline-flex h-10 items-center gap-2.5 rounded-lg border border-slate-800 bg-[#111726] px-3 text-xs font-medium text-slate-200 transition-colors hover:border-slate-700 hover:bg-slate-800/70"
            aria-label="User profile menu"
            aria-expanded={showProfileMenu}
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/15 font-mono text-[11px] font-semibold text-sky-300">
              {getInitials(user?.name)}
            </div>
            <span className="hidden sm:inline whitespace-nowrap">
              {user?.name || 'User'}
            </span>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-60 rounded-xl border border-slate-800 bg-[#111726] p-3 shadow-xl">
              <div className="border-b border-slate-800/80 pb-2.5 px-1">
                <p className="text-sm font-semibold text-slate-100 truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">
                  {user?.email}
                </p>
              </div>
              <div className="mt-2 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    navigate('/settings');
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-slate-300 transition-colors hover:bg-slate-800/80 hover:text-white"
                >
                  <Settings className="h-3.5 w-3.5 text-slate-400" />
                  <span>Account Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-rose-300 transition-colors hover:bg-rose-500/10 hover:text-rose-200"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

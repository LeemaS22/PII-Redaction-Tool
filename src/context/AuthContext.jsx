import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_BASE, apiFetch } from '../services/apiConfig';

const AuthContext = createContext(null);

export const AUTH_TOKEN_KEY = 'redactx_auth_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on startup
  useEffect(() => {
    async function initAuth() {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await apiFetch(`${API_BASE}/api/auth/me`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.user) {
            setUser(json.user);
          } else {
            localStorage.removeItem(AUTH_TOKEN_KEY);
            setUser(null);
          }
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
          setUser(null);
        }
      } catch (err) {
        console.error('Failed to validate session token:', err);
        localStorage.removeItem(AUTH_TOKEN_KEY);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await apiFetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Invalid email or password');
    }

    if (json.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, json.token);
    }
    setUser(json.user);
    return json.user;
  };

  const register = async (name, email, password, confirmPassword) => {
    const res = await apiFetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password, confirmPassword }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || json.error || 'Registration failed');
    }

    if (json.token) {
      localStorage.setItem(AUTH_TOKEN_KEY, json.token);
    }
    setUser(json.user);
    return json.user;
  };

  const logout = async () => {
    try {
      await apiFetch(`${API_BASE}/api/auth/logout`, { method: 'POST' });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setUser(null);
    }
  };

  const value = {
    user,
    isAuthenticated: !!user,
    loading,
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

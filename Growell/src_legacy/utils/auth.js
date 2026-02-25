// Utility functions for authentication — synced with Next.js auth keys

export const AUTH_KEY = 'growell_auth';
export const TOKEN_KEY = 'growell_token';

export const saveAuth = (userData, token) => {
  localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
  if (token) localStorage.setItem(TOKEN_KEY, token);
};

export const getAuth = () => {
  const authData = localStorage.getItem(AUTH_KEY);
  return authData ? JSON.parse(authData) : null;
};

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const isAuthenticated = () => {
  return getAuth() !== null && getToken() !== null;
};

export const clearAuth = () => {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const getUserData = () => {
  return getAuth();
};

/**
 * Make authenticated API calls to the Next.js backend.
 * Automatically attaches JWT Bearer token from localStorage.
 * API_BASE should be the Next.js server URL (e.g. http://localhost:3001)
 */
export const apiFetch = async (path, options = {}) => {
  const token = getToken();
  const apiBase = import.meta.env.VITE_NEXTJS_API_URL || 'http://localhost:3001';
  const url = path.startsWith('http') ? path : `${apiBase}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    window.location.href = '/login';
    throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
  }
  return res;
};

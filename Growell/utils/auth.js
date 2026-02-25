// Client-side auth utility for Next.js frontend
const AUTH_KEY = 'growell_auth';
const TOKEN_KEY = 'growell_token';

export const saveAuth = (userData, token) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
  if (token) localStorage.setItem(TOKEN_KEY, token);
};

export const getAuth = () => {
  if (typeof window === 'undefined') return null;
  const authData = localStorage.getItem(AUTH_KEY);
  return authData ? JSON.parse(authData) : null;
};

export const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
};

export const isAuthenticated = () => getAuth() !== null && getToken() !== null;

export const clearAuth = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
};

export const getUserData = () => getAuth();

// Helper to make authenticated API calls
export const apiFetch = async (url, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
  }
  return res;
};

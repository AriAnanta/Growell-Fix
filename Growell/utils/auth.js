/**
 * Client-side auth utility — Cookie-based (no localStorage)
 *
 * Two cookies are used:
 *   growell_token  — HTTP-only, not readable by JS (set by server, secure JWT)
 *   growell_user   — Readable by JS, holds display info (nama, role, etc.)
 *
 * Authentication state is maintained via these cookies across all browser tabs
 * and survives page refreshes without any localStorage dependency.
 */

// Read a non-httponly cookie by name
function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** Returns the stored user profile object, or null if not logged in */
export const getUserData = () => {
  const raw = readCookie('growell_user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
};

/** True if a valid user session cookie exists */
export const isAuthenticated = () => getUserData() !== null;

/**
 * Clears both session cookies by calling the logout API.
 * Returns a Promise — always await this before navigating to /login
 * so the Set-Cookie:expired headers arrive BEFORE the middleware checks cookies.
 */
export const clearAuth = () =>
  fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});

/**
 * Authenticated fetch — sends cookies automatically via credentials: 'include'.
 * No manual token attachment needed; the browser handles the HTTP-only cookie.
 */
export const apiFetch = async (url, options = {}) => {
  const res = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401 || res.status === 403) {
    clearAuth();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sesi Anda telah berakhir. Silakan login kembali.');
  }
  return res;
};

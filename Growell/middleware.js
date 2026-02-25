import { NextResponse } from 'next/server';

/**
 * Next.js Edge Middleware — Role-based Route Protection
 *
 * Runs on every non-static request BEFORE it reaches the page.
 * Reads the growell_token cookie and decodes the JWT payload (no DB call).
 *
 * Security note: The JWT signature is NOT verified here (Edge runtime has no Node crypto).
 * This middleware is for UX routing only. Real security enforcement happens in
 * each API route via requireAuth() which fully verifies the token against the DB.
 */

// ── Route → allowed roles ─────────────────────────────────────────────────
const ROUTE_ROLES = [
  { pattern: /^\/kader(\/|$)/,       roles: ['kader'] },
  { pattern: /^\/orang-tua(\/|$)/,   roles: ['orang_tua'] },
  { pattern: /^\/kelurahan(\/|$)/,   roles: ['kelurahan', 'puskesmas'] },
  { pattern: /^\/konsultasi(\/|$)/,  roles: ['ahli_gizi', 'orang_tua'] },
  { pattern: /^\/laporan(\/|$)/,     roles: ['kader', 'puskesmas', 'kelurahan'] },
  { pattern: /^\/data-balita(\/|$)/, roles: ['kader', 'puskesmas', 'kelurahan', 'ahli_gizi'] },
  { pattern: /^\/profile(\/|$)/,     roles: ['kader', 'orang_tua', 'kelurahan', 'puskesmas', 'ahli_gizi'] },
];

// Where each role is redirected to after login
const ROLE_HOME = {
  kader:      '/kader',
  orang_tua:  '/orang-tua',
  kelurahan:  '/kelurahan',
  puskesmas:  '/kelurahan',
  ahli_gizi:  '/konsultasi',
};

// ── JWT decode (no verification — Edge-compatible) ───────────────────────
function decodeJWT(token) {
  try {
    const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(b64);
    const payload = JSON.parse(json);
    // Reject expired tokens
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

// ── Middleware ────────────────────────────────────────────────────────────
export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Decode JWT from HTTP-only cookie
  const token   = request.cookies.get('growell_token')?.value;
  const payload = token ? decodeJWT(token) : null;
  const role    = payload?.role ?? null;
  const isLoggedIn = !!role;

  // ── Redirect logged-in users away from /login and /register ──
  if (pathname.startsWith('/login') || pathname.startsWith('/register')) {
    if (isLoggedIn) {
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', request.url));
    }
    // Clear stale cookies if token is expired/invalid
    if (token && !payload) {
      const res = NextResponse.next();
      res.cookies.set('growell_token', '', { maxAge: 0, path: '/' });
      res.cookies.set('growell_user',  '', { maxAge: 0, path: '/' });
      return res;
    }
    return NextResponse.next();
  }

  // ── Protect role-specific routes ──────────────────────────────
  const routeRule = ROUTE_ROLES.find(r => r.pattern.test(pathname));
  if (routeRule) {
    if (!isLoggedIn) {
      // Not authenticated — redirect to login and remember destination
      const url = new URL('/login', request.url);
      url.searchParams.set('redirect', pathname);
      const res = NextResponse.redirect(url);
      // Clear any stale cookies
      if (token) {
        res.cookies.set('growell_token', '', { maxAge: 0, path: '/' });
        res.cookies.set('growell_user',  '', { maxAge: 0, path: '/' });
      }
      return res;
    }

    if (!routeRule.roles.includes(role)) {
      // Wrong role — redirect to their correct home page
      return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/login', request.url));
    }
  }

  return NextResponse.next();
}

// ── Matcher: apply to all non-asset, non-api paths ───────────────────────
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)).*)',
  ],
};

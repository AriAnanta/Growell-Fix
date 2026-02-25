import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clears the growell_token (HTTP-only JWT) and growell_user cookies.
 */
export async function POST() {
  const response = NextResponse.json({ message: 'Logout berhasil' });

  // Expire both cookies immediately
  response.cookies.set('growell_token', '', { maxAge: 0, path: '/' });
  response.cookies.set('growell_user', '',  { maxAge: 0, path: '/' });

  return response;
}

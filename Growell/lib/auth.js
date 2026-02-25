import jwt from 'jsonwebtoken';
import pool from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'growell_jwt_secret_key_2024_very_secure';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Generate JWT token
 */
export function generateToken(userId, role) {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify JWT token and return decoded payload
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

/**
 * Extract user from request — reads JWT from the growell_token cookie (primary)
 * or falls back to the Authorization: Bearer header (for API clients).
 */
export async function getAuthUser(request) {
  // 1. Cookie (set by login route — HTTP-only, secure)
  let token = request.cookies?.get?.('growell_token')?.value;

  // 2. Authorization header fallback (API clients, curl, etc.)
  if (!token) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
  }

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  const [users] = await pool.query(
    `SELECT id, uuid, nama, email, role, no_telepon, alamat, foto_profil, posyandu_id, is_active, is_new_user 
     FROM users WHERE id = ? AND is_active = TRUE`,
    [decoded.userId]
  );

  return users[0] || null;
}

/**
 * Middleware-like helper for protected API routes
 * Returns { user } on success, or a Response with 401/403 on failure
 */
export async function requireAuth(request, allowedRoles = null) {
  const user = await getAuthUser(request);

  if (!user) {
    return { 
      error: Response.json(
        { error: 'Token autentikasi diperlukan atau tidak valid' }, 
        { status: 401 }
      ) 
    };
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return { 
      error: Response.json(
        { error: 'Anda tidak memiliki akses untuk melakukan ini' }, 
        { status: 403 }
      ) 
    };
  }

  return { user };
}

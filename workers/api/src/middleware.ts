import { createMiddleware } from 'hono/factory';
import { getCookie } from 'hono/cookie';
import type { DbUser, DbSession, User } from '@mockd/shared/types';
import type { Env } from './index';

// Extend Hono's Variables type
declare module 'hono' {
  interface ContextVariableMap {
    user: User | null;
    userId: string | null;
  }
}

// Transform DbUser to API User type
function mapDbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    email: dbUser.email,
    tier: dbUser.tier,
    createdAt: dbUser.created_at,
    updatedAt: dbUser.updated_at,
  };
}

// Get user by session ID
async function getUserBySession(db: D1Database, sessionId: string): Promise<DbUser | null> {
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")'
  ).bind(sessionId).first<DbSession>();

  if (!session) return null;

  return db.prepare('SELECT * FROM users WHERE id = ?').bind(session.user_id).first<DbUser>();
}

// Hash API token for lookup
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray, b => b.toString(16).padStart(2, '0')).join('');
}

// Get user by API token
async function getUserByToken(db: D1Database, token: string): Promise<DbUser | null> {
  const tokenHash = await hashToken(token);

  const tokenRecord = await db.prepare(
    'SELECT * FROM api_tokens WHERE token_hash = ? AND expires_at > datetime("now")'
  ).bind(tokenHash).first<{ id: string; user_id: string }>();

  if (!tokenRecord) return null;

  // Update last_used_at
  await db.prepare(
    'UPDATE api_tokens SET last_used_at = datetime("now") WHERE id = ?'
  ).bind(tokenRecord.id).run();

  return db.prepare('SELECT * FROM users WHERE id = ?').bind(tokenRecord.user_id).first<DbUser>();
}

/**
 * Auth middleware that validates session or Bearer token and attaches user to context.
 * Supports both cookie-based sessions (web) and Bearer tokens (mobile).
 * Does NOT block unauthenticated requests - use requireAuth for that.
 */
export const authMiddleware = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  let dbUser: DbUser | null = null;

  // Check for Bearer token first (mobile apps)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    dbUser = await getUserByToken(c.env.DB, token);
  }

  // Fall back to session cookie (web apps)
  if (!dbUser) {
    const sessionId = getCookie(c, 'mockd_session');
    if (sessionId) {
      dbUser = await getUserBySession(c.env.DB, sessionId);
    }
  }

  if (dbUser) {
    c.set('user', mapDbUserToUser(dbUser));
    c.set('userId', dbUser.id);
  } else {
    c.set('user', null);
    c.set('userId', null);
  }

  await next();
});

/**
 * Middleware that requires authentication.
 * Supports both cookie-based sessions (web) and Bearer tokens (mobile).
 * Returns 401 if no valid session or token exists.
 */
export const requireAuth = createMiddleware<{ Bindings: Env }>(async (c, next) => {
  let dbUser: DbUser | null = null;

  // Check for Bearer token first (mobile apps)
  const authHeader = c.req.header('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    dbUser = await getUserByToken(c.env.DB, token);
    if (!dbUser) {
      return c.json({ error: 'Invalid or expired token' }, 401);
    }
  } else {
    // Fall back to session cookie (web apps)
    const sessionId = getCookie(c, 'mockd_session');
    if (!sessionId) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    dbUser = await getUserBySession(c.env.DB, sessionId);
    if (!dbUser) {
      return c.json({ error: 'Invalid session' }, 401);
    }
  }

  c.set('user', mapDbUserToUser(dbUser));
  c.set('userId', dbUser.id);

  await next();
});

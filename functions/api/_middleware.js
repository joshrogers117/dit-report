import { verifyToken } from '@clerk/backend';

const CLERK_PUBLISHABLE_KEY = 'pk_test_cHJvbXB0LWNvbGxpZS01OC5jbGVyay5hY2NvdW50cy5kZXYk';
const CLERK_SECRET_KEY = undefined; // Set via Cloudflare Pages secret: CLERK_SECRET_KEY

// Admin user ID — set after first login
const ADMIN_USER_ID = 'user_3BEZSyDNoiKkCd5Dap0gMUSOw3h';

// Per-isolate cache of known user IDs (avoids repeated D1 lookups)
const knownUsers = new Set();

// Paths that don't require authentication
const PUBLIC_PATHS = ['/api/health', '/api/status'];

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Skip auth for public paths
  if (PUBLIC_PATHS.includes(url.pathname)) {
    return next();
  }

  // Extract Bearer token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const token = authHeader.slice(7);

  let payload;
  try {
    payload = await verifyToken(token, {
      secretKey: env.CLERK_SECRET_KEY,
    });
  } catch (err) {
    console.error('Token verification failed:', err.message, err.reason);
    return new Response(JSON.stringify({ error: 'Invalid or expired token', detail: err.message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userId = payload.sub;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid token: no subject' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check for admin impersonation
  const impersonateHeader = request.headers.get('x-impersonate-user');
  if (impersonateHeader && userId === ADMIN_USER_ID) {
    request.userId = impersonateHeader;
    request.isAdmin = true;
    request.realUserId = userId;
  } else {
    request.userId = userId;
    request.isAdmin = userId === ADMIN_USER_ID;
  }

  // Auto-provision user if not in cache
  if (!knownUsers.has(userId)) {
    try {
      const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(userId).first();
      if (!existing) {
        const email = payload.email || payload.email_addresses?.[0]?.email_address || '';
        const name = payload.name || [payload.first_name, payload.last_name].filter(Boolean).join(' ') || '';
        await env.DB.prepare(
          'INSERT INTO users (id, email, name) VALUES (?, ?, ?)'
        ).bind(userId, email, name).run();
      }
      knownUsers.add(userId);
    } catch (err) {
      // Table might not exist yet — ensureDB will create it
      console.error('User provisioning error:', err.message);
    }
  }

  return next();
}

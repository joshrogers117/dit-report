import { verifyToken } from '@clerk/backend';
import { ADMIN_USER_ID } from '../../lib/auth-constants.js';
import { seedDemoProject } from '../../lib/demo-project.js';

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
      jwtKey: env.CLERK_JWT_KEY,
    });
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
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
    context.data.userId = impersonateHeader;
    context.data.isAdmin = true;
    context.data.realUserId = userId;
  } else {
    context.data.userId = userId;
    context.data.isAdmin = userId === ADMIN_USER_ID;
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
        // Seed a demo project for new users
        try { await seedDemoProject(env.DB, userId); } catch (e) { console.error('Demo seed error:', e.message); }
      }
      knownUsers.add(userId);
    } catch (err) {
      // Table might not exist yet — ensureDB will create it
      console.error('User provisioning error:', err.message);
    }
  }

  return next();
}

import type { MiddlewareHandler } from '../deps.ts';
import { supabaseAdmin } from './supabaseAdmin.ts';
import { parseBearer } from './pure/authz.ts';

/**
 * Validates the Bearer token once and attaches the user to the context.
 * Replaces the ~30 inline `getAuthenticatedUser` blocks.
 */
export const requireUser: MiddlewareHandler = async (c, next) => {
  const token = parseBearer(c.req.header('Authorization'));
  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return c.json({ error: error?.message ?? 'Unauthorized' }, 401);
  }

  c.set('user', user);
  await next();
};

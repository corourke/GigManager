import type { Context, Hono } from '../deps.ts';

// Values attached to the Hono context by middleware.
export interface AppVariables {
  // Set by requireUser
  user: { id: string; email?: string; [k: string]: unknown };
  // Set by requireOrgRole (org routes) or requireGigAccess (gig routes)
  membership?: { role: string; organization_id?: string; [k: string]: unknown };
  // The org id the request was authorized against
  orgId?: string;
}

export type AppContext = Context<{ Variables: AppVariables }>;

export type App = Hono<{ Variables: AppVariables }>;

export type OrgIdSource = (c: AppContext) => string | undefined | Promise<string | undefined>;

/**
 * Shared data-access layer for src/services/* (issue #20). Generic CRUD +
 * centralized auth on top of the Supabase client — zero domain knowledge.
 * RLS remains the actual security boundary; these helpers are ergonomics
 * only. Domain services keep composing their own multi-table logic — this
 * only replaces the copy-pasted `.from(table).eq(...)` plumbing and the
 * per-function `requireAuth()` import.
 */
import { createClient } from '../../utils/supabase/client';
import { requireAuth } from '../../utils/supabase/auth-utils';
import { handleApiError } from '../../utils/api-error-utils';
import type { Database } from '../../utils/supabase/database.types';

export const getSupabase = () => createClient();

/** Any table name in the generated schema — keeps `.from(table)` type-checked. */
export type TableName = keyof Database['public']['Tables'];

/** One auth path wrapping the existing requireAuth() — kept, not replaced. */
export async function getCurrentUser() {
  const { user } = await requireAuth();
  return user;
}

export async function getSession() {
  const { session } = await requireAuth();
  return session;
}

export type FilterOperator = 'eq' | 'neq' | 'in' | 'ilike' | 'gt' | 'gte' | 'lt' | 'lte' | 'is';

export interface QueryFilter {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

export interface ListOptions {
  select?: string;
  filters?: QueryFilter[];
  order?: { column: string; ascending?: boolean };
  limit?: number;
}

function applyFilters<Q>(query: Q, filters?: QueryFilter[]): Q {
  if (!filters || filters.length === 0) return query;
  return filters.reduce((q: any, f) => q[f.operator](f.column, f.value), query as any);
}

// The Supabase client's generated types tie each table's row/insert/update
// shape to its literal name via overloads that don't resolve through a
// generic `table: TableName` parameter. `as any` on `.from(table)` here is
// the standard escape hatch for a generic wrapper like this one; callers
// still get a checked `TableName` and a caller-supplied `T` for the result.

export async function listRecords<T>(table: TableName, options: ListOptions = {}): Promise<T[]> {
  try {
    let query: any = (getSupabase().from(table) as any).select(options.select ?? '*');
    query = applyFilters(query, options.filters);
    if (options.order) query = query.order(options.order.column, { ascending: options.order.ascending ?? true });
    if (options.limit) query = query.limit(options.limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as T[];
  } catch (err) {
    return handleApiError(err, `list records from '${table}'`);
  }
}

export async function getRecord<T>(table: TableName, id: string, select = '*'): Promise<T | null> {
  try {
    const { data, error } = await (getSupabase().from(table) as any).select(select).eq('id', id).maybeSingle();
    if (error) throw error;
    return (data ?? null) as T | null;
  } catch (err) {
    return handleApiError(err, `get record from '${table}'`);
  }
}

export async function createRecord<T>(table: TableName, data: Record<string, unknown>): Promise<T> {
  try {
    const { data: created, error } = await (getSupabase().from(table) as any).insert(data).select().single();
    if (error) throw error;
    return created as T;
  } catch (err) {
    return handleApiError(err, `create record in '${table}'`);
  }
}

export async function updateRecord<T>(table: TableName, id: string, patch: Record<string, unknown>): Promise<T> {
  try {
    const { data, error } = await (getSupabase().from(table) as any).update(patch).eq('id', id).select().single();
    if (error) throw error;
    return data as T;
  } catch (err) {
    return handleApiError(err, `update record in '${table}'`);
  }
}

export async function deleteRecord(table: TableName, id: string): Promise<void> {
  try {
    const { error } = await (getSupabase().from(table) as any).delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    handleApiError(err, `delete record from '${table}'`);
  }
}

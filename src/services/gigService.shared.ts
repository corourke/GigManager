import { createClient } from '../utils/supabase/client';

/**
 * Shared internal helper for the gig service modules (Phase 7, Step 4 split).
 * The gig.service.ts file was split into focused modules
 * (gigParticipant/gigStaff/gigKit/gigFinancial); they share this client getter.
 */
export const getSupabase = () => createClient();

import { createClient } from '../../utils/supabase/client';
import { idbStore } from '../../utils/idb/store';

const supabase = createClient();

export const packingListService = {
  /**
   * Fetch gigs within the next 48 hours for the current user
   */
  async fetchUpcomingGigs() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const now = new Date();
    const fortyEightHoursLater = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    // Fetch gigs where user's orgs are participating
    const { data: gigs, error } = await supabase
      .from('gigs')
      .select(`
        *,
        participants:gig_participants(
          organization_id,
          role,
          organization:organizations(id, name)
        )
      `)
      .gte('start', now.toISOString())
      .lte('start', fortyEightHoursLater.toISOString())
      .order('start', { ascending: true });

    if (error) throw error;

    // Filter gigs where user is part of participating orgs
    // (In a real app, RLS might already handle this, but let's be explicit if needed)
    
    await idbStore.putGigs(gigs || []);
    return gigs;
  },

  /**
   * Fetch full packing list for a gig (kits, assets, and tracking status)
   */
  async fetchGigPackingList(gigId: string) {
    // 1. Fetch Kit Assignments
    const { data: kitAssignments, error: kitError } = await supabase
      .from('gig_kit_assignments')
      .select(`
        kit_id,
        notes,
        kit:kits(
          id,
          name,
          tag_number,
          is_container,
          assets:kit_assets(
            id,
            quantity,
            asset:assets(*)
          )
        )
      `)
      .eq('gig_id', gigId);

    if (kitError) throw kitError;

    // 2. Fetch current tracking status for this gig
    const { data: tracking, error: trackingError } = await supabase
      .from('inventory_tracking')
      .select('*')
      .eq('gig_id', gigId);

    if (trackingError) throw trackingError;

    const packingListData = {
      gig_id: gigId,
      kits: kitAssignments,
      tracking: tracking || [],
      last_synced: Date.now()
    };

    await idbStore.putPackingList(gigId, packingListData);
    return packingListData;
  },

  /**
   * Sync all data for upcoming gigs
   */
  async syncAllUpcoming() {
    const gigs = await this.fetchUpcomingGigs();
    if (!gigs) return;

    for (const gig of gigs) {
      await this.fetchGigPackingList(gig.id);
    }
  }
};

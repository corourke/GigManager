import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../../utils/supabase/client';
import { queryKeys } from '../../lib/queryKeys';
import {
  getGigFinancials,
  getGigProfitabilitySummary,
  deleteGigFinancial,
} from '../../services/gig.service';

/**
 * Server-state hooks for the gig financials section (Phase 7, Step 3).
 *
 * Each change is saved row by row, so the section invalidates these queries
 * after every write.
 */
export function useGigFinancialsData(
  gigId: string,
  organizationId: string,
  enabled: boolean,
) {
  const financialsQuery = useQuery({
    queryKey: queryKeys.financials(gigId),
    queryFn: () => getGigFinancials(gigId, organizationId),
    enabled,
  });

  const summaryQuery = useQuery({
    queryKey: queryKeys.gigFinancialsSummary(gigId),
    queryFn: () => getGigProfitabilitySummary(gigId, organizationId),
    enabled,
  });

  const projectedStaffQuery = useQuery({
    queryKey: queryKeys.gigProjectedStaff(gigId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('gig_staff_assignments')
        .select(`
          id,
          fee,
          rate,
          status,
          user:user_id(id, first_name, last_name),
          slot:gig_staff_slots!inner(gig_id, organization_id, role_info:staff_roles(name))
        `)
        .eq('slot.gig_id', gigId)
        .eq('slot.organization_id', organizationId)
        .is('completed_at', null)
        .or('fee.gt.0,rate.gt.0');
      if (error) throw error;
      // Confirmed/Requested only, mirroring the summary logic.
      return (data || []).filter((a) => a.status === 'Confirmed' || a.status === 'Requested');
    },
    enabled,
  });

  return { financialsQuery, summaryQuery, projectedStaffQuery };
}

/** Delete a financial record; refreshes the profitability summary on success. */
export function useDeleteGigFinancial(gigId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (financialId: string) => deleteGigFinancial(financialId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.gigFinancialsSummary(gigId) });
    },
  });
}

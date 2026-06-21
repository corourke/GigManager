import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import {
  getAsset,
  getAssetHistory,
  getAssetInventoryTracking,
  createAsset,
  updateAsset,
} from '../../services/asset.service';

/**
 * Server-state hooks for AssetScreen (Phase 7, Step 3).
 *
 * In edit mode the asset feeds a form (manual useState + change detection), so
 * like the gig financials section the asset query is NOT invalidated by its own
 * mutations — the form re-syncs only when the query data first arrives. The
 * read-only history/tracking tables are plain display reads.
 */
export function useAssetData(assetId: string | null | undefined) {
  const enabled = !!assetId;

  const assetQuery = useQuery({
    queryKey: queryKeys.asset(assetId ?? 'new'),
    queryFn: () => getAsset(assetId as string),
    enabled,
  });

  const statusHistoryQuery = useQuery({
    queryKey: queryKeys.assetStatusHistory(assetId ?? 'new'),
    queryFn: () => getAssetStatusHistory(assetId as string),
    enabled,
  });

  const inventoryTrackingQuery = useQuery({
    queryKey: queryKeys.assetInventoryTracking(assetId ?? 'new'),
    queryFn: () => getAssetInventoryTracking(assetId as string),
    enabled,
  });

  const activityQuery = useQuery({
    queryKey: ['asset-activity', assetId],
    queryFn: () => getAssetHistory(assetId as string),
    enabled,
  });

  return { assetQuery, statusHistoryQuery, inventoryTrackingQuery, activityQuery };
}

/** Create/update mutations; invalidate the org's asset list on success. */
export function useAssetMutations(organizationId: string) {
  const queryClient = useQueryClient();
  const invalidateList = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.assets(organizationId) });

  const createAssetMutation = useMutation({
    mutationFn: (data: Parameters<typeof createAsset>[0]) => createAsset(data),
    onSuccess: invalidateList,
  });

  const updateAssetMutation = useMutation({
    mutationFn: (vars: { id: string; data: Parameters<typeof updateAsset>[1] }) =>
      updateAsset(vars.id, vars.data),
    onSuccess: invalidateList,
  });

  return { createAsset: createAssetMutation, updateAsset: updateAssetMutation };
}

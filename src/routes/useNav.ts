import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import type { Organization } from '../utils/supabase/types';

export interface FinancialsNavOptions {
  highlightPurchaseId?: string | null;
  returnGigId?: string | null;
}

/**
 * Navigation handlers built on react-router's `useNavigate`. These replace the
 * hand-rolled `setCurrentRoute(...)` callbacks from the old App.tsx state
 * machine so screens can keep their existing `onX` callback contracts while
 * navigation becomes URL-driven.
 */
export function useNav() {
  const navigate = useNavigate();
  const { selectOrganization, logout } = useAuth();

  return useMemo(() => ({
    // Top-level destinations
    toDashboard: () => navigate('/dashboard'),
    toGigs: () => navigate('/gigs'),
    toCalendar: () => navigate('/calendar'),
    toTeam: () => navigate('/team'),
    toAssets: () => navigate('/assets'),
    toKits: () => navigate('/kits'),
    toInventory: () => navigate('/inventory'),
    toImport: () => navigate('/import'),
    toSettings: () => navigate('/settings'),

    // Gigs
    createGig: () => navigate('/gigs/new'),
    viewGig: (gigId: string, fromCalendar?: boolean) =>
      navigate(`/gigs/${gigId}${fromCalendar ? '?from=calendar' : ''}`),
    editGig: (gigId: string) => navigate(`/gigs/${gigId}/edit`),

    // Assets
    createAsset: () => navigate('/assets/new'),
    viewAsset: (assetId: string) => navigate(`/assets/${assetId}`),
    editAsset: (assetId: string) => navigate(`/assets/${assetId}/edit`),

    // Kits
    createKit: () => navigate('/kits/new'),
    viewKit: (kitId: string) => navigate(`/kits/${kitId}`),
    editKit: (kitId: string) => navigate(`/kits/${kitId}/edit`),

    // Team
    viewMember: (memberId: string) => navigate(`/team/${memberId}`),

    // Financials (carries highlight/return context as search params)
    toFinancials: (opts?: FinancialsNavOptions) => {
      const params = new URLSearchParams();
      if (opts?.highlightPurchaseId) params.set('highlight', opts.highlightPurchaseId);
      if (opts?.returnGigId) params.set('returnGig', opts.returnGigId);
      const query = params.toString();
      navigate(`/financials${query ? `?${query}` : ''}`);
    },

    // Organizations
    toOrgSelection: () => navigate('/org-selection'),
    toCreateOrg: () => navigate('/create-org'),
    toAdminOrgs: () => navigate('/admin/orgs'),
    editOrg: (org: Organization) => navigate(`/admin/orgs/${org.id}/edit`),

    // Switch organization: clear selection and return to the picker.
    switchOrganization: () => {
      selectOrganization(null);
      navigate('/org-selection');
    },

    // Logout: clear session, then return to the root (login gate handles the rest).
    logoutAndHome: async () => {
      await logout();
      navigate('/');
    },

    navigate,
  }), [navigate, selectOrganization, logout]);
}

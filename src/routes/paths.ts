/**
 * URL shapes for pages with tabs, so every tab has an address: refresh,
 * bookmarks and back/forward all land on the same tab. The first tab of each
 * page is the page's own URL (`/financials`, `/gigs/:id`, `/inventory`).
 */

// ─── Gig page ───────────────────────────────────────────────────────────────

export const GIG_TABS = ['overview', 'equipment', 'financials', 'history'] as const;
export type GigTab = (typeof GIG_TABS)[number];

export function parseGigTab(segment: string | undefined): GigTab {
  return (GIG_TABS as readonly string[]).includes(segment ?? '') ? (segment as GigTab) : 'overview';
}

/** `/gigs/:id`, `/gigs/:id/financials`, `/gigs/:id/edit/equipment`… */
export function gigPath(gigId: string, opts: { tab?: GigTab; editing?: boolean } = {}): string {
  const base = `/gigs/${gigId}${opts.editing ? '/edit' : ''}`;
  return opts.tab && opts.tab !== 'overview' ? `${base}/${opts.tab}` : base;
}

// ─── Financials ─────────────────────────────────────────────────────────────

export const FINANCIAL_TABS = ['purchases', 'gig-accounting', 'reporting'] as const;
export type FinancialTab = (typeof FINANCIAL_TABS)[number];

/** Purchases sub-tabs, as views and as URL segments. */
export type PurchasesView = 'report' | 'manual' | 'scan';
const PURCHASES_SEGMENT: Record<PurchasesView, string | null> = { report: null, manual: 'add', scan: 'scan' };

export function parseFinancialsPath(tab: string | undefined, sub: string | undefined): {
  tab: FinancialTab;
  purchasesView: PurchasesView;
} {
  const t = (FINANCIAL_TABS as readonly string[]).includes(tab ?? '') ? (tab as FinancialTab) : 'purchases';
  const view = (Object.entries(PURCHASES_SEGMENT).find(([, seg]) => seg && seg === sub)?.[0] ?? 'report') as PurchasesView;
  return { tab: t, purchasesView: t === 'purchases' ? view : 'report' };
}

/** `/financials`, `/financials/gig-accounting`, `/financials/purchases/scan`… */
export function financialsPath(tab: FinancialTab = 'purchases', purchasesView: PurchasesView = 'report'): string {
  if (tab !== 'purchases') return `/financials/${tab}`;
  const seg = PURCHASES_SEGMENT[purchasesView];
  return seg ? `/financials/purchases/${seg}` : '/financials';
}

// ─── Inventory ──────────────────────────────────────────────────────────────

export const INVENTORY_TABS = ['summary', 'explorer', 'reports', 'tracking'] as const;
export type InventoryTab = (typeof INVENTORY_TABS)[number];

export function parseInventoryTab(segment: string | undefined): InventoryTab {
  return (INVENTORY_TABS as readonly string[]).includes(segment ?? '') ? (segment as InventoryTab) : 'summary';
}

export function inventoryPath(tab: InventoryTab = 'summary'): string {
  return tab === 'summary' ? '/inventory' : `/inventory/${tab}`;
}

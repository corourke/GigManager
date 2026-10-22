import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '../utils/supabase/client';

vi.mock('../utils/supabase/client', () => ({
  createClient: vi.fn(),
}));

function makeQueryChain(result: { data: any; error: any }) {
  const chain: any = {};
  const methods = ['select', 'eq', 'in', 'or', 'order', 'range', 'limit'];
  methods.forEach((m) => { chain[m] = vi.fn().mockReturnValue(chain); });
  chain.single = vi.fn().mockResolvedValue(result);
  chain.maybeSingle = vi.fn().mockResolvedValue(result);
  chain.then = (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject);
  return chain;
}

// #186 step 2: the maintenance services. The database functions do the work; the no-gig send
// first applies the Locations rule's home count, which the database leaves to the screens.
describe('maintenance.service', () => {
  let mockSupabase: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = { from: vi.fn(), rpc: vi.fn().mockResolvedValue({ data: 'asset-1', error: null }) };
    (createClient as any).mockReturnValue(mockSupabase);
  });

  const tables = (byTable: Record<string, any>) =>
    mockSupabase.from.mockImplementation((t: string) => byTable[t] ?? makeQueryChain({ data: [], error: null }));

  describe('sendToMaintenance', () => {
    it('with a gig: calls send_to_maintenance without reading where it is', async () => {
      const { sendToMaintenance } = await import('./maintenance.service');
      const id = await sendToMaintenance({
        assetId: 'lot-1', quantity: 2, notes: 'Frayed', location: 'Repair Bench', expectedBack: '2026-11-03', gigId: 'gig-1',
      });
      expect(id).toBe('asset-1');
      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(mockSupabase.rpc).toHaveBeenCalledWith('send_to_maintenance', {
        p_asset_id: 'lot-1', p_quantity: 2, p_notes: 'Frayed', p_location: 'Repair Bench',
        p_expected_back: '2026-11-03', p_gig_id: 'gig-1',
      });
    });

    it('without a gig: sends no more of a lot than the Locations rule says are home', async () => {
      const { sendToMaintenance } = await import('./maintenance.service');
      tables({
        assets: makeQueryChain({ data: { id: 'lot-1', quantity: 10, status: 'Active', serial_number: null, tag_number: null, retired_on: null, organization_id: 'org-1' }, error: null }),
        inventory_tracking: makeQueryChain({ data: [
          { id: 't1', asset_id: 'lot-1', gig_id: 'g1', kit_id: null, status: 'On Site', quantity: 6, scanned_at: '2026-10-01T10:00:00Z', created_at: null },
        ], error: null }),
      });
      await expect(sendToMaintenance({ assetId: 'lot-1', quantity: 5 })).rejects.toThrow('Only 4 of them are home');
      expect(mockSupabase.rpc).not.toHaveBeenCalled();

      await sendToMaintenance({ assetId: 'lot-1', quantity: 4, notes: '  ', location: null });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('send_to_maintenance', {
        p_asset_id: 'lot-1', p_quantity: 4, p_notes: null, p_location: null, p_expected_back: null, p_gig_id: null,
      });
    });

    it('without a gig: a lot in a container counts once, wherever the case went', async () => {
      const { sendToMaintenance } = await import('./maintenance.service');
      tables({
        assets: makeQueryChain({ data: { id: 'lot-1', quantity: 10, status: 'Active', organization_id: 'org-1' }, error: null }),
        inventory_tracking: makeQueryChain({ data: [
          { id: 't1', asset_id: 'lot-1', gig_id: 'g1', kit_id: 'case', status: 'On Site', quantity: 4, scanned_at: '2026-10-01T10:00:00Z', kit: { is_container: true } },
          { id: 't2', asset_id: 'lot-1', gig_id: 'g2', kit_id: 'case', status: 'Checked Out', quantity: 4, scanned_at: '2026-10-02T10:00:00Z', kit: { is_container: true } },
        ], error: null }),
      });
      await sendToMaintenance({ assetId: 'lot-1', quantity: 6 });
      expect(mockSupabase.rpc).toHaveBeenCalled();
    });

    it('without a gig: none of a lot home says so', async () => {
      const { sendToMaintenance } = await import('./maintenance.service');
      tables({
        assets: makeQueryChain({ data: { id: 'lot-1', quantity: 2, status: 'Active', organization_id: 'org-1' }, error: null }),
        inventory_tracking: makeQueryChain({ data: [
          { id: 't1', asset_id: 'lot-1', gig_id: 'g1', kit_id: null, status: 'On Site', quantity: 2, scanned_at: '2026-10-01T10:00:00Z' },
        ], error: null }),
      });
      await expect(sendToMaintenance({ assetId: 'lot-1', quantity: 1 })).rejects.toThrow('None of them are home');
    });

    it('without a gig: a unit out at a gig is refused', async () => {
      const { sendToMaintenance } = await import('./maintenance.service');
      tables({
        assets: makeQueryChain({ data: { id: 'u1', quantity: 1, tag_number: 'DSL-0104', status: 'Active', organization_id: 'org-1' }, error: null }),
        inventory_tracking: makeQueryChain({ data: [
          { id: 't1', asset_id: 'u1', gig_id: 'g1', kit_id: 'k1', status: 'On Site', quantity: 1, scanned_at: '2026-10-01T10:00:00Z' },
        ], error: null }),
      });
      await expect(sendToMaintenance({ assetId: 'u1', quantity: 1 })).rejects.toThrow("This unit isn't home yet");
      expect(mockSupabase.rpc).not.toHaveBeenCalled();
    });

    it("passes on the database's refusal as a readable error, with its code", async () => {
      const { sendToMaintenance } = await import('./maintenance.service');
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { code: '22023', message: 'This equipment is already flagged for maintenance.' } });
      const err = await sendToMaintenance({ assetId: 'lot-1', quantity: 1, gigId: 'g1' }).catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toBe('This equipment is already flagged for maintenance.');
      expect(err.code).toBe('22023');
    });
  });

  describe('updateMaintenance / returnToService', () => {
    it('updateMaintenance calls update_maintenance, blanks as null', async () => {
      const { updateMaintenance } = await import('./maintenance.service');
      mockSupabase.rpc.mockResolvedValue({ data: null, error: null });
      await updateMaintenance('a1', { notes: 'Recone', location: '', expectedBack: null });
      expect(mockSupabase.rpc).toHaveBeenCalledWith('update_maintenance', {
        p_asset_id: 'a1', p_notes: 'Recone', p_location: null, p_expected_back: null,
      });
    });

    it('returnToService calls return_to_service and returns the record it ends up in', async () => {
      const { returnToService } = await import('./maintenance.service');
      mockSupabase.rpc.mockResolvedValue({ data: 'lot-1', error: null });
      expect(await returnToService('piece-1')).toBe('lot-1');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('return_to_service', { p_asset_id: 'piece-1' });
    });

    it('returnToService passes on a refusal', async () => {
      const { returnToService } = await import('./maintenance.service');
      mockSupabase.rpc.mockResolvedValue({ data: null, error: { code: '42501', message: 'Returning equipment to service takes Staff or above of its organization.' } });
      await expect(returnToService('a1')).rejects.toThrow('takes Staff or above');
    });
  });

  describe('getMaintenanceList', () => {
    const base = {
      serial_number: null, tag_number: null, quantity: 1, status: 'Maintenance', equipment_item_id: 'item-1', purchase_line_id: 'line-1',
      maintenance_notes: null, maintenance_location: null, maintenance_expected_back: null, maintenance_since: '2026-10-20T10:00:00Z',
      maintenance_from: null, maintenance_pending: false, maintenance_pending_gig_id: null, maintenance_pending_quantity: null,
      flagged_by: { first_name: 'Sam', last_name: 'Ruiz', email: 's@x' }, pending_gig: null,
    };

    it('groups what is in maintenance and what is flagged, with the lot a piece came from', async () => {
      const { getMaintenanceList } = await import('./maintenance.service');
      const assets = makeQueryChain({ data: [
        { ...base, id: 'u1', manufacturer_model: 'QSC K12.2', tag_number: 'DSL-0104', serial_number: 'S123', maintenance_notes: 'Rattles', maintenance_location: 'Repair Bench', maintenance_expected_back: '2026-11-03' },
        { ...base, id: 'piece-1', manufacturer_model: 'XLR Cable, 25 ft', quantity: 2, maintenance_from: 'lot-1' },
        { ...base, id: 'lot-2', manufacturer_model: 'Mic Stand', quantity: 10, status: 'Active', maintenance_pending: true,
          maintenance_pending_gig_id: 'g1', maintenance_pending_quantity: 3, pending_gig: { title: 'Harvest Gala' } },
      ], error: null });
      const lots = makeQueryChain({ data: [
        { id: 'lot-1', quantity: 18, status: 'Active', retired_on: null, maintenance_pending: false, equipment_item_id: 'item-1', purchase_line_id: 'line-1' },
      ], error: null });
      const tracking = makeQueryChain({ data: [
        { id: 't2', asset_id: 'u1', scanned_at: '2026-10-19T10:00:00Z', created_at: null, gig: { title: 'Fall Fest' } },
        { id: 't1', asset_id: 'u1', scanned_at: '2026-10-10T10:00:00Z', created_at: null, gig: { title: 'Older Gig' } },
        { id: 't3', asset_id: 'lot-1', scanned_at: '2026-10-18T10:00:00Z', created_at: null, gig: { title: 'Lot Gig' } },
      ], error: null });
      let assetCalls = 0;
      mockSupabase.from.mockImplementation((t: string) => {
        if (t === 'assets') return assetCalls++ === 0 ? assets : lots;
        return tracking;
      });

      const list = await getMaintenanceList('org-1');
      expect(assets.eq).toHaveBeenCalledWith('organization_id', 'org-1');
      expect(assets.or).toHaveBeenCalledWith('status.eq.Maintenance,maintenance_pending.eq.true');
      expect(list.inMaintenance.map((r) => r.asset_id)).toEqual(['u1', 'piece-1']);
      expect(list.flagged.map((r) => r.asset_id)).toEqual(['lot-2']);

      const [unitRow, pieceRow] = list.inMaintenance;
      expect(unitRow).toMatchObject({
        item_name: 'QSC K12.2', kind: 'unit', pieces: 1, notes: 'Rattles', location: 'Repair Bench',
        expected_back: '2026-11-03', flagged_by_name: 'Sam Ruiz', last_gig_title: 'Fall Fest', from_lot: null,
      });
      expect(pieceRow).toMatchObject({
        kind: 'lot', pieces: 2, from_lot: { id: 'lot-1', quantity: 18, will_merge: true }, last_gig_title: 'Lot Gig',
      });
      expect(list.flagged[0]).toMatchObject({ pieces: 3, quantity: 10, pending_gig_id: 'g1', pending_gig_title: 'Harvest Gala' });
    });

    it("a piece won't merge into a lot that's retired, flagged, or of another item or line", async () => {
      const { getMaintenanceList } = await import('./maintenance.service');
      const assets = makeQueryChain({ data: [
        { ...base, id: 'p1', quantity: 1, maintenance_from: 'lot-a' },
        { ...base, id: 'p2', quantity: 1, maintenance_from: 'lot-b' },
        { ...base, id: 'p3', quantity: 1, maintenance_from: 'lot-c' },
        { ...base, id: 'p4', quantity: 1, maintenance_from: 'lot-d' },
        { ...base, id: 'p5', quantity: 1, maintenance_from: 'lot-ok', tag_number: 'NEW-1' },
        { ...base, id: 'p6', quantity: 1, maintenance_from: 'lot-gone' },
      ], error: null });
      const ok = { status: 'Active', retired_on: null, maintenance_pending: false, equipment_item_id: 'item-1', purchase_line_id: 'line-1', quantity: 5 };
      const lots = makeQueryChain({ data: [
        { ...ok, id: 'lot-a', retired_on: '2026-10-01' },
        { ...ok, id: 'lot-b', maintenance_pending: true },
        { ...ok, id: 'lot-c', equipment_item_id: 'item-2' },
        { ...ok, id: 'lot-d', purchase_line_id: 'line-2' },
        { ...ok, id: 'lot-ok' },
      ], error: null });
      let assetCalls = 0;
      mockSupabase.from.mockImplementation((t: string) => (t === 'assets' ? (assetCalls++ === 0 ? assets : lots) : makeQueryChain({ data: [], error: null })));
      const list = await getMaintenanceList('org-1');
      const merge = Object.fromEntries(list.inMaintenance.map((r) => [r.asset_id, r.from_lot?.will_merge ?? null]));
      expect(merge).toEqual({ p1: false, p2: false, p3: false, p4: false, p5: false, p6: false });
    });

    it('merges by the database rule: a lot with no line takes any piece; a piece with no line only a lot with none', async () => {
      const { getMaintenanceList } = await import('./maintenance.service');
      const assets = makeQueryChain({ data: [
        { ...base, id: 'q1', organization_id: 'org-1', purchase_line_id: null, maintenance_from: 'lot-line' },
        { ...base, id: 'q2', organization_id: 'org-1', purchase_line_id: 'line-1', maintenance_from: 'lot-noline' },
        { ...base, id: 'q3', organization_id: 'org-1', purchase_line_id: null, maintenance_from: 'lot-noline' },
        { ...base, id: 'q4', organization_id: 'org-1', maintenance_from: 'lot-other-org' },
      ], error: null });
      const ok = { organization_id: 'org-1', status: 'Active', retired_on: null, maintenance_pending: false, equipment_item_id: 'item-1', quantity: 5 };
      const lots = makeQueryChain({ data: [
        { ...ok, id: 'lot-line', purchase_line_id: 'line-1' },
        { ...ok, id: 'lot-noline', purchase_line_id: null },
        { ...ok, id: 'lot-other-org', purchase_line_id: 'line-1', organization_id: 'org-2' },
      ], error: null });
      let assetCalls = 0;
      mockSupabase.from.mockImplementation((t: string) => (t === 'assets' ? (assetCalls++ === 0 ? assets : lots) : makeQueryChain({ data: [], error: null })));
      const list = await getMaintenanceList('org-1');
      const merge = Object.fromEntries(list.inMaintenance.map((r) => [r.asset_id, r.from_lot?.will_merge ?? null]));
      expect(merge).toEqual({ q1: false, q2: true, q3: true, q4: false });
    });

    it('lists the newest first, with records that have no date last', async () => {
      const { getMaintenanceList } = await import('./maintenance.service');
      const assets = makeQueryChain({ data: [], error: null });
      tables({ assets });
      await getMaintenanceList('org-1');
      expect(assets.order).toHaveBeenCalledWith('maintenance_since', { ascending: false, nullsFirst: false });
    });

    it('an empty list reads nothing more', async () => {
      const { getMaintenanceList } = await import('./maintenance.service');
      tables({ assets: makeQueryChain({ data: [], error: null }) });
      expect(await getMaintenanceList('org-1')).toEqual({ inMaintenance: [], flagged: [] });
      expect(mockSupabase.from).toHaveBeenCalledTimes(1);
    });
  });

  describe('whichLabel / isOverdue', () => {
    const row = (over: any) => ({
      asset_id: 'a', item_name: 'X', tag_number: null, serial_number: null, kind: 'lot', quantity: 10, pieces: 10,
      from_lot: null, notes: null, location: null, expected_back: null, since: null, flagged_by_name: null,
      last_gig_title: null, pending_gig_id: null, pending_gig_title: null, ...over,
    });

    it('names which piece it is', async () => {
      const { whichLabel } = await import('./maintenance.service');
      expect(whichLabel(row({ kind: 'unit', tag_number: 'DSL-0104', serial_number: 'S123', quantity: 1, pieces: 1 }))).toBe('DSL-0104 · S/N S123');
      expect(whichLabel(row({ kind: 'unit', serial_number: 'S123', quantity: 1, pieces: 1 }))).toBe('S/N S123');
      expect(whichLabel(row({ quantity: 2, pieces: 2, from_lot: { id: 'l', quantity: 18, will_merge: true } }))).toBe('2 split from the lot (now 18)');
      expect(whichLabel(row({ quantity: 1, pieces: 1, from_lot: { id: 'l', quantity: 18, will_merge: true } }))).toBe('1 split from the lot (now 18)');
      expect(whichLabel(row({ quantity: 1, pieces: 1, from_lot: { id: 'l', quantity: null, will_merge: false } }))).toBe('1 split from a lot no longer on hand');
      expect(whichLabel(row({ quantity: 10, pieces: 10 }))).toBe('Whole lot of 10');
      expect(whichLabel(row({ quantity: 10, pieces: 3, pending_gig_id: 'g' }))).toBe('3 of the lot of 10');
    });

    it('is overdue only when expected back is before today', async () => {
      const { isOverdue } = await import('./maintenance.service');
      expect(isOverdue('2026-10-21', '2026-10-22')).toBe(true);
      expect(isOverdue('2026-10-22', '2026-10-22')).toBe(false);
      expect(isOverdue(null, '2026-10-22')).toBe(false);
    });
  });
});

import { describe, it, expect } from 'vitest';
import {
  financialsPath,
  gigPath,
  inventoryPath,
  legacyInventoryTab,
  parseFinancialsPath,
  parseGigTab,
  parseInventoryTab,
} from './paths';

describe('route paths', () => {
  it('gives every gig tab an address, in view and edit mode', () => {
    expect(gigPath('g1')).toBe('/gigs/g1');
    expect(gigPath('g1', { tab: 'overview' })).toBe('/gigs/g1');
    expect(gigPath('g1', { tab: 'financials' })).toBe('/gigs/g1/financials');
    expect(gigPath('g1', { tab: 'equipment', editing: true })).toBe('/gigs/g1/edit/equipment');
    expect(gigPath('g1', { editing: true })).toBe('/gigs/g1/edit');
  });

  it('reads gig tabs back, falling back to overview', () => {
    expect(parseGigTab('history')).toBe('history');
    expect(parseGigTab(undefined)).toBe('overview');
    expect(parseGigTab('nonsense')).toBe('overview');
  });

  it('round-trips the financials tabs and purchases sub-tabs', () => {
    expect(financialsPath()).toBe('/financials');
    expect(financialsPath('gig-accounting')).toBe('/financials/gig-accounting');
    expect(financialsPath('purchases', 'manual')).toBe('/financials/purchases/add');
    expect(financialsPath('purchases', 'scan')).toBe('/financials/purchases/scan');

    expect(parseFinancialsPath(undefined, undefined)).toEqual({ tab: 'purchases', purchasesView: 'report' });
    expect(parseFinancialsPath('gig-accounting', undefined)).toEqual({ tab: 'gig-accounting', purchasesView: 'report' });
    expect(parseFinancialsPath('purchases', 'add')).toEqual({ tab: 'purchases', purchasesView: 'manual' });
    expect(parseFinancialsPath('purchases', 'scan')).toEqual({ tab: 'purchases', purchasesView: 'scan' });
    expect(parseFinancialsPath('bogus', 'scan')).toEqual({ tab: 'purchases', purchasesView: 'scan' });
  });

  it('gives each Equipment tab past Assets and Kits an /equipment address (#39)', () => {
    expect(inventoryPath()).toBe('/equipment/out-on-gigs');
    expect(inventoryPath('locations')).toBe('/equipment/locations');
    expect(inventoryPath('maintenance')).toBe('/equipment/maintenance');
    expect(parseInventoryTab('locations')).toBe('locations');
    expect(parseInventoryTab(undefined)).toBe('out-on-gigs');
    expect(parseInventoryTab('bogus')).toBe('out-on-gigs');
  });

  it('maps the old /inventory sub-tabs onto the new tabs, so old links still land', () => {
    expect(legacyInventoryTab(undefined)).toBe('out-on-gigs');
    expect(legacyInventoryTab('summary')).toBe('out-on-gigs');
    expect(legacyInventoryTab('tracking')).toBe('out-on-gigs');
    expect(legacyInventoryTab('explorer')).toBe('locations');
    expect(legacyInventoryTab('reports')).toBe('locations');
  });
});

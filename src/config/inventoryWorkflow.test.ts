import { describe, it, expect } from 'vitest';
import { SCANNING_MODES } from './inventoryWorkflow';

describe('SCANNING_MODES', () => {
  it('every entry has a non-empty locationLabel', () => {
    expect(SCANNING_MODES.length).toBeGreaterThan(0);
    for (const mode of SCANNING_MODES) {
      expect(typeof mode.locationLabel).toBe('string');
      expect(mode.locationLabel.trim().length).toBeGreaterThan(0);
    }
  });
});

// #185 PR 2 (Cameron, 10-09): equipment not on the list can be added only while packing:
// Pack-Out, and Load Truck (gear sometimes skips pack-out). Gated by mode, not status:
// Load-Out also gives In Transit.
describe('allowsAdHoc', () => {
  it('only Pack-Out and Load Truck', () => {
    expect(SCANNING_MODES.filter((m) => m.allowsAdHoc).map((m) => m.id)).toEqual(['pack-out', 'load-truck']);
    expect(SCANNING_MODES.find((m) => m.id === 'load-out')?.resultingStatus)
      .toBe(SCANNING_MODES.find((m) => m.id === 'load-truck')?.resultingStatus);
  });
});

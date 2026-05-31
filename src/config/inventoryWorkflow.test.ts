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

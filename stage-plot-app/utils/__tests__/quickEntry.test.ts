import { describe, it, expect } from 'vitest';
import { parseQuickEntry } from '../quickEntry';

describe('parseQuickEntry', () => {
  it('parses name only', () => {
    expect(parseQuickEntry('Kick')).toEqual({ type: 'Other', name: 'Kick', channelName: undefined, model: undefined });
  });

  it('parses type and name (structured)', () => {
    expect(parseQuickEntry('M:Kick')).toEqual({ type: 'Microphone', name: 'Kick', channelName: undefined, model: undefined });
  });

  it('parses name and channel (structured)', () => {
    expect(parseQuickEntry('Keys/L')).toEqual({ type: 'Other', name: 'Keys', channelName: 'L', model: undefined });
  });

  it('parses space-separated syntax (mobile friendly)', () => {
    expect(parseQuickEntry('M Kick')).toEqual({ type: 'Microphone', name: 'Kick', channelName: undefined, model: undefined });
    expect(parseQuickEntry('Mic Kick In')).toEqual({ type: 'Microphone', name: 'Kick', channelName: 'In', model: undefined });
    expect(parseQuickEntry('Keys L')).toEqual({ type: 'Other', name: 'Keys', channelName: 'L', model: undefined });
  });

  it('parses space-separated with model', () => {
    expect(parseQuickEntry('M Kick (Beta 52)')).toEqual({ type: 'Microphone', name: 'Kick', channelName: undefined, model: 'Beta 52' });
    expect(parseQuickEntry('M Kick In (Beta 91)')).toEqual({ type: 'Microphone', name: 'Kick', channelName: 'In', model: 'Beta 91' });
  });

  it('handles instrument alias', () => {
    expect(parseQuickEntry('Keys Roland')).toEqual({ type: 'Other', name: 'Keys', channelName: 'Roland', model: undefined });
  });
});

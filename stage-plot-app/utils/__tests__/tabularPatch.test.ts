import { describe, it, expect } from 'vitest';
import { resolveTabularPatch } from '../signalChain';
import { Project } from '../../models';

const mockId = () => Math.random().toString(36).substr(2, 9);
const mockTimestamp = new Date().toISOString();

describe('Tabular Patch Logic', () => {
  it('groups stagebox inputs and outputs, then sorts by number', () => {
    const stageboxId = 'sb1';
    const mixerId = 'mix1';
    
    const micId = 'mic1';
    const spkId = 'spk1';

    const project: Project = {
      id: mockId(),
      name: 'Test Project',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      devices: [
        {
          id: micId,
          name: 'Vocal',
          type: 'Microphone',
          outputChannels: [{ id: 'mic-out', number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputChannels: [],
          metadata: {},
        },
        {
          id: spkId,
          name: 'Speaker 1',
          type: 'Speaker',
          inputChannels: [{ id: 'spk-in', number: 1, channelCount: 1, phantomPower: false, pad: false }],
          outputChannels: [],
          metadata: {},
        },
        {
          id: stageboxId,
          name: 'Stagebox',
          type: 'Stagebox',
          // Complex device
          inputChannels: [
            { id: 'sb-in-7', number: 7, channelCount: 1, phantomPower: false, pad: false },
            { id: 'sb-in-8', number: 8, channelCount: 1, phantomPower: false, pad: false },
            { id: 'sb-in-ext', number: 9, channelCount: 1, phantomPower: false, pad: false },
          ],
          outputChannels: [
            { id: 'sb-out-7', number: 7, channelCount: 1, phantomPower: false, pad: false },
            { id: 'sb-out-8', number: 8, channelCount: 1, phantomPower: false, pad: false },
            { id: 'sb-out-ext', number: 9, channelCount: 1, phantomPower: false, pad: false },
          ],
          metadata: {},
        },
        {
          id: mixerId,
          name: 'Mixer',
          type: 'Mixer',
          inputChannels: [
            { id: 'mix-in-1', number: 1, channelCount: 1, phantomPower: false, pad: false },
            { id: 'mix-in-2', number: 2, channelCount: 1, phantomPower: false, pad: false },
          ],
          outputChannels: [
            { id: 'mix-out-1', number: 1, channelCount: 1, name: 'Main L', phantomPower: false, pad: false },
            { id: 'mix-out-2', number: 2, channelCount: 1, phantomPower: false, pad: false },
          ],
          metadata: {},
        },
      ],
      connections: [
        // Mic -> SB In 7 -> SB Out 7 -> Mixer In 1
        {
          id: mockId(),
          sourceDeviceId: micId,
          sourceChannelId: 'mic-out',
          destinationDeviceId: stageboxId,
          destinationChannelId: 'sb-in-7',
        },
        {
          id: mockId(),
          sourceDeviceId: stageboxId,
          sourceChannelId: 'sb-out-7',
          destinationDeviceId: mixerId,
          destinationChannelId: 'mix-in-1',
        },
        // Mixer Out 1 -> SB In 8 -> SB Out 8 -> Speaker 1
        {
          id: mockId(),
          sourceDeviceId: mixerId,
          sourceChannelId: 'mix-out-1',
          destinationDeviceId: stageboxId,
          destinationChannelId: 'sb-in-8',
        },
        {
          id: mockId(),
          sourceDeviceId: stageboxId,
          sourceChannelId: 'sb-out-8',
          destinationDeviceId: spkId,
          destinationChannelId: 'spk-in',
        },
      ],
      groups: [],
      categories: [],
    };

    const rows = resolveTabularPatch(project);

    // Should have 5 rows: 
    // 1. SB 7 (Mic 1 -> SB 7 -> Mixer 1)
    // 2. SB 9 (Orphaned SB 9)
    // 3. Mixer In 2 (Orphaned Mixer In 2)
    // 4. Mixer Out 1 (Sink Output)
    // 5. Mixer Out 2 (Sink Output)
    expect(rows.length).toBe(5);

    // Sorting rule: ALL inputs first, then ALL outputs (sinks)
    // 1. SB 7 (Mic 1 -> SB 7 -> Mixer 1)
    // 2. SB 9 (Orphaned SB 9)
    // 3. Mixer In 2 (Orphaned Mixer In 2)
    // 4. SB 8 (Mixer 1 -> SB 8 -> Speaker 1) - THIS IS A SINK because source is Mixer output
    
    expect(rows[0].sourceDeviceName).toBe('Vocal');
    expect(rows[0].hops.find(h => h.deviceId === stageboxId)?.inputChannelNumber).toBe(7);
    
    expect(rows[1].sourceDeviceName).toBe(''); // Orphaned SB 9
    expect(rows[1].hops.find(h => h.deviceId === stageboxId)?.inputChannelNumber).toBe(9);

    expect(rows[2].sourceDeviceName).toBe(''); // Orphaned Mixer In 2
    expect(rows[2].hops.find(h => h.deviceId === mixerId)?.inputChannelNumber).toBe(2);

    expect(rows[3].sourceDeviceName).toBe('Mixer'); // Sink SB 8
    expect(rows[3].isSink).toBe(true);
    expect(rows[3].hops.find(h => h.deviceId === stageboxId)?.inputChannelNumber).toBe(8);
  });

  it('generates orphaned rows for Mixer inputs', () => {
    const mixerId = 'mix1';
    
    const project: Project = {
      id: mockId(),
      name: 'Test Project',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      devices: [
        {
          id: mixerId,
          name: 'FOH',
          type: 'Mixer',
          inputChannels: [
            { id: 'mix-in-1', number: 1, channelCount: 1, phantomPower: false, pad: false },
            { id: 'mix-in-2', number: 2, channelCount: 1, phantomPower: false, pad: false },
            { id: 'mix-in-3', number: 3, channelCount: 1, phantomPower: false, pad: false },
          ],
          outputChannels: [],
          metadata: {},
        },
      ],
      connections: [],
      groups: [],
      categories: [],
    };

    const rows = resolveTabularPatch(project);

    // Should have 3 rows (Mixer Input 1, 2, 3)
    expect(rows.length).toBe(3);
    expect(rows[0].sourceDeviceName).toBe('');
    expect(rows[0].hops[0].deviceId).toBe(mixerId);
    expect(rows[0].hops[0].inputChannelNumber).toBe(1);
    expect(rows[1].hops[0].inputChannelNumber).toBe(2);
  });
});

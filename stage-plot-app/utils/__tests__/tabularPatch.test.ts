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
          name: 'Mic 1',
          type: 'Microphone',
          outputChannels: [{ id: 'mic-out', number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputChannels: [],
          metadata: { generalName: 'Vocal' },
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

    // Should have 3 rows (SB 7, SB 8, SB 9)
    expect(rows.length).toBe(3);

    // Sorting rule: Stagebox inputs should be together and in order
    // SB Ch 7 (Mic 1 -> SB Ch 7)
    // SB Ch 8 (Mixer Out 1 -> SB Ch 8)
    // SB Ch 9 (Orphaned SB Ch 9)
    
    expect(rows[0].sourceDeviceName).toBe('Mic 1');
    expect(rows[0].hops.find(h => h.deviceId === stageboxId)?.inputChannelNumber).toBe(7);
    
    expect(rows[1].sourceDeviceName).toBe('Mixer');
    expect(rows[1].hops.find(h => h.deviceId === stageboxId)?.inputChannelNumber).toBe(8);

    expect(rows[2].sourceDeviceName).toBe('Stagebox');
    expect(rows[2].sourceChannelNumber).toBe(9);
  });
});

import { describe, it, expect } from 'vitest';
import { resolveSignalChain, resolveChannelMapping, resolveTabularPatch } from '../signalChain';
import { Project, Device, Connection, Channel } from '../../models';

const mockId = () => Math.random().toString(36).substr(2, 9);
const mockTimestamp = new Date().toISOString();

describe('Signal Chain Logic (Refined)', () => {
  it('cascades name ONLY if channel name is blank', () => {
    const micId = mockId();
    const micOutId = mockId();
    const mixerId = mockId();
    const mixerInId = mockId();

    const project: Project = {
      id: mockId(),
      name: 'Test Project',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      devices: [
        {
          id: micId,
          name: 'Kick Mic',
          type: 'Microphone',
          outputChannels: [{ id: micOutId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputChannels: [],
          metadata: { generalName: 'Kick' },
        },
        {
          id: mixerId,
          name: 'Mixer',
          type: 'Mixer',
          inputChannels: [{ id: mixerInId, number: 1, channelCount: 1, name: 'Custom Name', phantomPower: false, pad: false }], // Override
          outputChannels: [],
          metadata: {},
        },
      ],
      connections: [
        {
          id: mockId(),
          sourceDeviceId: micId,
          sourceChannelId: micOutId,
          destinationDeviceId: mixerId,
          destinationChannelId: mixerInId,
        },
      ],
      groups: [],
      categories: [],
    };

    const state = resolveSignalChain(project);
    expect(state[`${mixerId}:${mixerInId}`]?.effectiveName).toBe('Custom Name');
  });

  it('Mixer (routable) signal flow follows matching effectiveNames', () => {
    const micId = mockId();
    const micOutId = mockId();
    const mixerId = mockId();
    const mixerInId = mockId();
    const mixerOutId = mockId();

    const project: Project = {
      id: mockId(),
      name: 'Routable Test',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      devices: [
        {
          id: micId,
          name: 'Mic',
          type: 'Microphone',
          isSource: true,
          outputChannels: [{ id: micOutId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputChannels: [],
          metadata: { generalName: 'Kick' },
        },
        {
          id: mixerId,
          name: 'Mixer',
          type: 'Mixer',
          // Add extra channels to make it "complex"
          inputChannels: [
            { id: mixerInId, number: 1, channelCount: 1, phantomPower: false, pad: false },
            { id: 'extra-in', number: 2, channelCount: 1, phantomPower: false, pad: false }
          ],
          outputChannels: [
            { id: mixerOutId, number: 1, channelCount: 1, name: 'Kick', phantomPower: false, pad: false },
            { id: 'extra-out', number: 2, channelCount: 1, phantomPower: false, pad: false }
          ],
          metadata: {},
        },
      ],
      connections: [
        {
          id: mockId(),
          sourceDeviceId: micId,
          sourceChannelId: micOutId,
          destinationDeviceId: mixerId,
          destinationChannelId: mixerInId,
        },
      ],
      groups: [],
      categories: [],
    };

    const state = resolveSignalChain(project);
    expect(state[`${mixerId}:${mixerInId}`]?.effectiveName).toBe('Kick');
    expect(state[`${mixerId}:${mixerOutId}`]?.effectiveName).toBe('Kick');
    
    // Check tabular patch logic (should stay on one row)
    const tabular = resolveTabularPatch(project);
    const row = tabular.find(r => r.sourceDeviceId === micId);
    expect(row?.hops.length).toBe(1);
    expect(row?.hops[0].outputChannelId).toBe(mixerOutId);
  });

  it('Stagebox (non-routable) signal flow is 1:1 by number', () => {
    const micId = mockId();
    const micOutId = mockId();
    const sbId = mockId();
    const sbInId = mockId();
    const sbOutId = mockId();

    const project: Project = {
      id: mockId(),
      name: 'Stagebox Test',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      devices: [
        {
          id: micId,
          name: 'Mic',
          type: 'Microphone',
          isSource: true,
          outputChannels: [{ id: micOutId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputChannels: [],
          metadata: { generalName: 'Vocal' },
        },
        {
          id: sbId,
          name: 'Stagebox',
          type: 'Stagebox',
          inputChannels: [{ id: sbInId, number: 5, channelCount: 1, phantomPower: false, pad: false }],
          outputChannels: [{ id: sbOutId, number: 5, channelCount: 1, phantomPower: false, pad: false }],
          metadata: {},
        },
      ],
      connections: [
        {
          id: mockId(),
          sourceDeviceId: micId,
          sourceChannelId: micOutId,
          destinationDeviceId: sbId,
          destinationChannelId: sbInId,
        },
      ],
      groups: [],
      categories: [],
    };

    const state = resolveSignalChain(project);
    expect(state[`${sbId}:${sbInId}`]?.effectiveName).toBe('Vocal');
    expect(state[`${sbId}:${sbOutId}`]?.effectiveName).toBe('Vocal');
  });

  it('separates Inputs and Outputs in tabular patch', () => {
    const micId = mockId();
    const mixerId = mockId();
    const mixerOutId = mockId();

    const project: Project = {
      id: mockId(),
      name: 'Sorting Test',
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
      devices: [
        {
          id: micId,
          name: 'Mic',
          type: 'Microphone',
          outputChannels: [{ id: 'm1', number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputChannels: [],
          metadata: { generalName: 'Kick' },
        },
        {
          id: mixerId,
          name: 'Mixer',
          type: 'Mixer',
          // Make it complex
          inputChannels: [
            { id: 'i1', number: 1, channelCount: 1, phantomPower: false, pad: false },
            { id: 'i2', number: 2, channelCount: 1, phantomPower: false, pad: false }
          ],
          outputChannels: [
            { id: mixerOutId, number: 1, channelCount: 1, name: 'Main L', phantomPower: false, pad: false },
            { id: 'o2', number: 2, channelCount: 1, phantomPower: false, pad: false }
          ],
          metadata: {},
        },
      ],
      connections: [],
      groups: [],
      categories: [],
    };

    const tabular = resolveTabularPatch(project);
    expect(tabular.length).toBe(2);
    expect(tabular[0].sourceDeviceName).toBe('Mic'); // Input
    expect(tabular[0].isSink).toBeFalsy();
    expect(tabular[1].sourceDeviceName).toBe('Mixer'); // Output
    expect(tabular[1].isSink).toBeTruthy();
  });
});

import { describe, it, expect } from 'vitest';
import { resolveSignalChain, resolveChannelMapping } from '../signalChain';
import { Project, Device, Connection, Port } from '../../models';

const mockId = () => Math.random().toString(36).substr(2, 9);
const mockTimestamp = new Date().toISOString();

describe('Signal Chain Logic', () => {
  it('cascades name from terminal source through a chain', () => {
    const micId = mockId();
    const micOutId = mockId();
    const stageboxId = mockId();
    const stageboxInId = mockId();
    const stageboxOutId = mockId();
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
          outputPorts: [{ id: micOutId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputPorts: [],
          metadata: { generalName: 'Kick' },
        },
        {
          id: stageboxId,
          name: 'Stagebox 1',
          type: 'Stagebox',
          inputPorts: [{ id: stageboxInId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          outputPorts: [{ id: stageboxOutId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          metadata: {},
        },
        {
          id: mixerId,
          name: 'X32 Mixer',
          type: 'Mixer',
          inputPorts: [{ id: mixerInId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          outputPorts: [],
          metadata: {},
        },
      ],
      connections: [
        {
          id: mockId(),
          sourceDeviceId: micId,
          sourcePortId: micOutId,
          destinationDeviceId: stageboxId,
          destinationPortId: stageboxInId,
        },
        {
          id: mockId(),
          sourceDeviceId: stageboxId,
          sourcePortId: stageboxOutId,
          destinationDeviceId: mixerId,
          destinationPortId: mixerInId,
        },
      ],
      groups: [],
      categories: [],
    };

    const state = resolveSignalChain(project);

    // Mic output carries the name
    expect(state[`${micId}:${micOutId}`]?.effectiveName).toBe('Kick');

    // Stagebox input carries the name from mic
    expect(state[`${stageboxId}:${stageboxInId}`]?.effectiveName).toBe('Kick');

    // Stagebox output carries the name (automatic 1:1 internal mapping)
    expect(state[`${stageboxId}:${stageboxOutId}`]?.effectiveName).toBe('Kick');

    // Mixer input carries the name from stagebox output
    expect(state[`${mixerId}:${mixerInId}`]?.effectiveName).toBe('Kick');
  });

  it('handles 1:1 default channel mapping', () => {
    const sourcePort: Port = { id: 's1', number: 1, channelCount: 8, phantomPower: false, pad: false };
    const destPort: Port = { id: 'd1', number: 1, channelCount: 8, phantomPower: false, pad: false };
    const conn: Connection = {
      id: 'c1',
      sourceDeviceId: 'd_src',
      sourcePortId: 's1',
      destinationDeviceId: 'd_dest',
      destinationPortId: 'd1',
    };

    const mapping = resolveChannelMapping(conn, sourcePort, destPort);
    expect(mapping[1]).toBe(1);
    expect(mapping[8]).toBe(8);
    expect(Object.keys(mapping).length).toBe(8);
  });

  it('handles explicit channel mapping (offset/routing)', () => {
    const sourcePort: Port = { id: 's1', number: 1, channelCount: 1, phantomPower: false, pad: false };
    const destPort: Port = { id: 'd1', number: 1, channelCount: 8, phantomPower: false, pad: false };
    const conn: Connection = {
      id: 'c1',
      sourceDeviceId: 'd_src',
      sourcePortId: 's1',
      destinationDeviceId: 'd_dest',
      destinationPortId: 'd1',
      channelMapping: { '1': '5' }, // Source channel 1 to Destination channel 5
    };

    const mapping = resolveChannelMapping(conn, sourcePort, destPort);
    expect(mapping[1]).toBe(5);
    expect(Object.keys(mapping).length).toBe(1);
  });

  it('respects port name overrides', () => {
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
          outputPorts: [{ id: micOutId, number: 1, channelCount: 1, phantomPower: false, pad: false }],
          inputPorts: [],
          metadata: { generalName: 'Kick' },
        },
        {
          id: mixerId,
          name: 'Mixer',
          type: 'Mixer',
          inputPorts: [{ id: mixerInId, number: 1, channelCount: 1, name: 'Kick In', phantomPower: false, pad: false }], // Override
          outputPorts: [],
          metadata: {},
        },
      ],
      connections: [
        {
          id: mockId(),
          sourceDeviceId: micId,
          sourcePortId: micOutId,
          destinationDeviceId: mixerId,
          destinationPortId: mixerInId,
        },
      ],
      groups: [],
      categories: [],
    };

    const state = resolveSignalChain(project);
    expect(state[`${mixerId}:${mixerInId}`]?.effectiveName).toBe('Kick In');
  });
});

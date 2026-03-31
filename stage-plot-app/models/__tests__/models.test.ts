import { describe, it, expect } from 'vitest';
import { ProjectSchema, DeviceSchema, ConnectionSchema, PortSchema } from '../index';

describe('Stage Plot Models', () => {
  const mockId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTimestamp = new Date().toISOString();

  it('validates a valid Port', () => {
    const validPort = {
      id: mockId,
      number: 1,
      name: 'Main Out',
      channelCount: 2,
      connectorType: 'XLR',
    };
    const result = PortSchema.safeParse(validPort);
    expect(result.success).toBe(true);
  });

  it('validates a valid Device with default metadata', () => {
    const validDevice = {
      id: mockId,
      name: 'SM58',
      type: 'Microphone',
    };
    const result = DeviceSchema.safeParse(validDevice);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.metadata.phantomPower).toBe(false);
      expect(result.data.inputPorts).toEqual([]);
    }
  });

  it('validates a valid Connection', () => {
    const validConnection = {
      id: mockId,
      sourceDeviceId: mockId,
      sourcePortId: mockId,
      destinationDeviceId: mockId,
      destinationPortId: mockId,
      cableLength: 10,
    };
    const result = ConnectionSchema.safeParse(validConnection);
    expect(result.success).toBe(true);
  });

  it('validates a full Project', () => {
    const validProject = {
      id: mockId,
      name: 'Rock Concert',
      devices: [
        {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Kick Mic',
          type: 'Microphone',
          metadata: {
            generalName: 'Kick',
            specificType: 'D112',
            phantomPower: false,
          },
        },
      ],
      connections: [],
      groups: [],
      categories: [],
      createdAt: mockTimestamp,
      updatedAt: mockTimestamp,
    };
    const result = ProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('fails on invalid UUID', () => {
    const invalidDevice = {
      id: 'not-a-uuid',
      name: 'Bad Device',
      type: 'Test',
    };
    const result = DeviceSchema.safeParse(invalidDevice);
    expect(result.success).toBe(false);
  });

  it('fails on invalid stage position', () => {
    const invalidDevice = {
      id: mockId,
      name: 'Bad Position',
      type: 'Test',
      metadata: {
        stagePosition: 'UP' as any,
      },
    };
    const result = DeviceSchema.safeParse(invalidDevice);
    expect(result.success).toBe(false);
  });
});

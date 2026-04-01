import { describe, it, expect } from 'vitest';
import { ProjectSchema, DeviceSchema, ConnectionSchema, ChannelSchema } from '../index';

describe('Stage Plot Models', () => {
  const mockId = '123e4567-e89b-12d3-a456-426614174000';
  const mockTimestamp = new Date().toISOString();

  it('validates a valid Channel', () => {
    const validChannel = {
      id: mockId,
      number: 1,
      name: 'Main Out',
      channelCount: 2,
      connectorType: 'XLR',
    };
    const result = ChannelSchema.safeParse(validChannel);
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
      expect(result.data.inputChannels).toEqual([]);
    }
  });

  it('validates a valid Connection', () => {
    const validConnection = {
      id: mockId,
      sourceDeviceId: mockId,
      sourceChannelId: mockId,
      destinationDeviceId: mockId,
      destinationChannelId: mockId,
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
          id: 'dev-1',
          name: 'Kick Mic',
          type: 'Microphone',
          model: 'D112',
          metadata: {
            generalName: 'Kick',
          },
          outputChannels: [{
            id: 'channel-1',
            number: 1,
            name: 'Output',
            phantomPower: false,
          }]
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

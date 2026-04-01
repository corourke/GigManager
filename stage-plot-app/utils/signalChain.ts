import { Project, Device, Connection, Channel } from '../models';

export interface ChannelState {
  effectiveName: string;
  sourceDeviceId: string;
  sourceChannelId: string;
  path: string[]; // List of device IDs in the chain
}

export type SignalChainState = Record<string, ChannelState>; // key: deviceId:channelId

/**
 * Resolves the signal chain to determine the effective names of all channels.
 * Automatic name cascading from Stage terminal sources with user overrides.
 */
export function resolveSignalChain(project: Project): SignalChainState {
  const state: SignalChainState = {};

  // 1. Identify terminal sources (devices with metadata.generalName and output channels)
  const sources = project.devices.filter(d => d.metadata?.generalName && d.outputChannels.length > 0);

  // Initialize source output channels with their generalName or manual channel name override
  for (const device of sources) {
    for (const channel of device.outputChannels) {
      const name = channel.name || device.metadata.generalName!;
      const key = `${device.id}:${channel.id}`;
      state[key] = {
        effectiveName: name,
        sourceDeviceId: device.id,
        sourceChannelId: channel.id,
        path: [device.id],
      };
    }
  }

  // 2. Propagate names through connections
  // We use a simple iterative approach (like BFS/DFS) until convergence or a max depth
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    for (const conn of project.connections) {
      const sourceKey = `${conn.sourceDeviceId}:${conn.sourceChannelId}`;
      const destKey = `${conn.destinationDeviceId}:${conn.destinationChannelId}`;

      const sourceState = state[sourceKey];
      if (sourceState) {
        const destDevice = project.devices.find(d => d.id === conn.destinationDeviceId);
        const destChannel = destDevice?.inputChannels.find(c => c.id === conn.destinationChannelId);
        
        // Use channel name as override if present
        const effectiveName = destChannel?.name || sourceState.effectiveName;
        
        const existingDestState = state[destKey];
        
        // If destination doesn't have a state or it's different, update it
        if (!existingDestState || existingDestState.effectiveName !== effectiveName) {
          state[destKey] = {
            ...sourceState,
            effectiveName,
            path: [...sourceState.path, conn.destinationDeviceId],
          };
          changed = true;

          // Also propagate internally through the destination device if it's a "pass-through"
          if (destDevice && destDevice.outputChannels.length > 0) {
            const inputChannelIndex = destDevice.inputChannels.findIndex(c => c.id === conn.destinationChannelId);
            if (inputChannelIndex !== -1 && inputChannelIndex < destDevice.outputChannels.length) {
              const matchingOutputChannel = destDevice.outputChannels[inputChannelIndex];
              
              // Use output channel name as override if present
              const outEffectiveName = matchingOutputChannel.name || effectiveName;
              
              const outKey = `${destDevice.id}:${matchingOutputChannel.id}`;
              if (!state[outKey] || state[outKey].effectiveName !== outEffectiveName) {
                state[outKey] = {
                  ...sourceState,
                  effectiveName: outEffectiveName,
                  path: [...sourceState.path, destDevice.id],
                };
                changed = true;
              }
            }
          }
        }
      }
    }
  }

  return state;
}

/**
 * Calculates the channel mapping for a connection.
 * Handles 1:1 and offset channel mapping.
 */
export function resolveChannelMapping(
  conn: Connection,
  sourceChannel: Channel,
  destChannel: Channel
): Record<number, number> {
  const mapping: Record<number, number> = {};

  if (conn.channelMapping) {
    // Convert string record to number record
    for (const [srcChan, destChan] of Object.entries(conn.channelMapping)) {
      mapping[parseInt(srcChan, 10)] = parseInt(destChan, 10);
    }
  } else {
    // Default 1:1 mapping starting from channel 1
    const count = Math.min(sourceChannel.channelCount, destChannel.channelCount);
    for (let i = 1; i <= count; i++) {
      mapping[i] = i;
    }
  }

  return mapping;
}

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

/**
 * Identifies if a device is "simple" (total channels <= 2).
 * Simple devices are handled as rows in the patch sheet.
 */
export function isSimpleDevice(device: Device): boolean {
  const totalChannels = device.inputChannels.length + device.outputChannels.length;
  return totalChannels <= 2;
}

/**
 * Resolves the signal chain into a tabular format where each terminal simple device port is a row
 * and complex devices are "hops" (columns).
 */
export interface SignalHop {
  deviceId: string;
  deviceName: string;
  inputChannelId?: string;
  inputChannelNumber?: number;
  inputChannelName?: string;
  outputChannelId?: string;
  outputChannelNumber?: number;
  outputChannelName?: string;
  connectorType?: string;
  cableLabel?: string;
}

export interface TabularRow {
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceChannelId: string;
  sourceChannelNumber: number;
  sourceEffectiveName: string;
  isSink?: boolean; // If true, this row represents a terminal sink (like a speaker)
  hops: SignalHop[]; // Sequence of connections
  fullPath: Record<string, SignalHop>; // Map deviceId to hop info for easier lookup
}

export function resolveTabularPatch(project: Project): TabularRow[] {
  const rows: TabularRow[] = [];
  const simpleDevices = project.devices.filter(d => isSimpleDevice(d));

  for (const device of simpleDevices) {
    // 1. Handle Output Ports (Sources)
    for (const channel of device.outputChannels) {
      const row: TabularRow = {
        sourceDeviceId: device.id,
        sourceDeviceName: device.name,
        sourceChannelId: channel.id,
        sourceChannelNumber: channel.number,
        sourceEffectiveName: channel.name || device.metadata?.generalName || device.name,
        hops: [],
        fullPath: {}
      };

      // Traverse forward
      let currentDeviceId = device.id;
      let currentChannelId = channel.id;
      let visited = new Set<string>();

      while (true) {
        const key = `${currentDeviceId}:${currentChannelId}`;
        if (visited.has(key)) break;
        visited.add(key);

        const connection = project.connections.find(c => 
          c.sourceDeviceId === currentDeviceId && c.sourceChannelId === currentChannelId
        );

        if (!connection) break;

        const destDevice = project.devices.find(d => d.id === connection.destinationDeviceId);
        const destChannel = destDevice?.inputChannels.find(c => c.id === connection.destinationChannelId);

        if (!destDevice || !destChannel) break;

        // If destination is complex, add as a hop
        if (!isSimpleDevice(destDevice)) {
          const hop: SignalHop = {
            deviceId: destDevice.id,
            deviceName: destDevice.name,
            inputChannelId: destChannel.id,
            inputChannelNumber: destChannel.number,
            inputChannelName: destChannel.name,
            connectorType: destChannel.connectorType,
            cableLabel: connection.cableLabel
          };

          const inputIndex = destDevice.inputChannels.findIndex(c => c.id === destChannel.id);
          if (inputIndex !== -1 && destDevice.outputChannels[inputIndex]) {
            const outChan = destDevice.outputChannels[inputIndex];
            hop.outputChannelId = outChan.id;
            hop.outputChannelNumber = outChan.number;
            hop.outputChannelName = outChan.name;
            
            currentDeviceId = destDevice.id;
            currentChannelId = outChan.id;
          } else {
            currentDeviceId = ""; 
            currentChannelId = "";
          }

          row.hops.push(hop);
          row.fullPath[hop.deviceId] = hop;
        } else {
          // Terminal simple device reached
          break;
        }
        
        if (!currentDeviceId) break;
      }
      rows.push(row);
    }

    // 2. Handle Input Ports (Sinks)
    for (const channel of device.inputChannels) {
      const row: TabularRow = {
        sourceDeviceId: device.id,
        sourceDeviceName: device.name,
        sourceChannelId: channel.id,
        sourceChannelNumber: channel.number,
        sourceEffectiveName: channel.name || device.metadata?.generalName || device.name,
        isSink: true,
        hops: [],
        fullPath: {}
      };

      // Traverse backward to find connections through complex devices
      let currentDeviceId = device.id;
      let currentChannelId = channel.id;
      let visited = new Set<string>();

      while (true) {
        const key = `${currentDeviceId}:${currentChannelId}`;
        if (visited.has(key)) break;
        visited.add(key);

        const connection = project.connections.find(c => 
          c.destinationDeviceId === currentDeviceId && c.destinationChannelId === currentChannelId
        );

        if (!connection) break;

        const srcDevice = project.devices.find(d => d.id === connection.sourceDeviceId);
        const srcChannel = srcDevice?.outputChannels.find(c => c.id === connection.sourceChannelId);

        if (!srcDevice || !srcChannel) break;

        // If source is complex, add as a hop
        if (!isSimpleDevice(srcDevice)) {
          const hop: SignalHop = {
            deviceId: srcDevice.id,
            deviceName: srcDevice.name,
            outputChannelId: srcChannel.id,
            outputChannelNumber: srcChannel.number,
            outputChannelName: srcChannel.name,
            connectorType: srcChannel.connectorType,
            cableLabel: connection.cableLabel
          };

          const outputIndex = srcDevice.outputChannels.findIndex(c => c.id === srcChannel.id);
          if (outputIndex !== -1 && srcDevice.inputChannels[outputIndex]) {
            const inChan = srcDevice.inputChannels[outputIndex];
            hop.inputChannelId = inChan.id;
            hop.inputChannelNumber = inChan.number;
            hop.inputChannelName = inChan.name;
            
            currentDeviceId = srcDevice.id;
            currentChannelId = inChan.id;
          } else {
            currentDeviceId = ""; 
            currentChannelId = "";
          }

          row.hops.push(hop);
          row.fullPath[hop.deviceId] = hop;
        } else {
          // Reached another simple device
          break;
        }
        
        if (!currentDeviceId) break;
      }
      rows.push(row);
    }
  }

  return rows;
}

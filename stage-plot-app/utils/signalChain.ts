import { Project, Device, Connection, Port } from '../models';

export interface PortState {
  effectiveName: string;
  sourceDeviceId: string;
  sourcePortId: string;
  path: string[]; // List of device IDs in the chain
}

export type SignalChainState = Record<string, PortState>; // key: deviceId:portId

/**
 * Resolves the signal chain to determine the effective names of all ports.
 * Automatic name cascading from Stage terminal sources with user overrides.
 */
export function resolveSignalChain(project: Project): SignalChainState {
  const state: SignalChainState = {};

  // 1. Identify terminal sources (devices with metadata.generalName and output ports)
  const sources = project.devices.filter(d => d.metadata?.generalName && d.outputPorts.length > 0);

  // Initialize source output ports with their generalName or manual port name override
  for (const device of sources) {
    for (const port of device.outputPorts) {
      const name = port.name || device.metadata.generalName!;
      const key = `${device.id}:${port.id}`;
      state[key] = {
        effectiveName: name,
        sourceDeviceId: device.id,
        sourcePortId: port.id,
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
      const sourceKey = `${conn.sourceDeviceId}:${conn.sourcePortId}`;
      const destKey = `${conn.destinationDeviceId}:${conn.destinationPortId}`;

      const sourceState = state[sourceKey];
      if (sourceState) {
        const destDevice = project.devices.find(d => d.id === conn.destinationDeviceId);
        const destPort = destDevice?.inputPorts.find(p => p.id === conn.destinationPortId);
        
        // Use port name as override if present
        const effectiveName = destPort?.name || sourceState.effectiveName;
        
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
          if (destDevice && destDevice.outputPorts.length > 0) {
            const inputPortIndex = destDevice.inputPorts.findIndex(p => p.id === conn.destinationPortId);
            if (inputPortIndex !== -1 && inputPortIndex < destDevice.outputPorts.length) {
              const matchingOutputPort = destDevice.outputPorts[inputPortIndex];
              
              // Use output port name as override if present
              const outEffectiveName = matchingOutputPort.name || effectiveName;
              
              const outKey = `${destDevice.id}:${matchingOutputPort.id}`;
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
  sourcePort: Port,
  destPort: Port
): Record<number, number> {
  const mapping: Record<number, number> = {};

  if (conn.channelMapping) {
    // Convert string record to number record
    for (const [srcChan, destChan] of Object.entries(conn.channelMapping)) {
      mapping[parseInt(srcChan, 10)] = parseInt(destChan, 10);
    }
  } else {
    // Default 1:1 mapping starting from channel 1
    const count = Math.min(sourcePort.channelCount, destPort.channelCount);
    for (let i = 1; i <= count; i++) {
      mapping[i] = i;
    }
  }

  return mapping;
}

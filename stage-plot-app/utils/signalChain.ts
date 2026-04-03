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
 * Name propagation ONLY happens if the channel name is blank or null.
 */
export function resolveSignalChain(project: Project): SignalChainState {
  const state: SignalChainState = {};

  // 1. Identify all seeds
  // Seeds are terminal sources (simple devices with names/isSource) 
  // and ANY manual names on complex device outputs.
  for (const device of project.devices) {
    const isSimple = isSimpleDevice(device);
    
    // For Sources, the device name or generalName is the intended signal name
    const deviceDefaultName = (isSimple || device.isSource) 
      ? (device.metadata?.generalName || device.name) 
      : undefined;

    for (const channel of device.outputChannels) {
      // Use channel name if it exists and isn't a generic placeholder
      let name = channel.name;
      const isGeneric = !name || name.match(/^Ch \d+$/i) || name.toLowerCase() === 'output';
      
      if (isGeneric && deviceDefaultName) {
        name = deviceDefaultName;
      }

      if (name) {
        const key = `${device.id}:${channel.id}`;
        state[key] = {
          effectiveName: name,
          sourceDeviceId: device.id,
          sourceChannelId: channel.id,
          path: [device.id],
        };
      }
    }
  }

  // 2. Propagate names through connections and internal routing
  let changed = true;
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (changed && iterations < MAX_ITERATIONS) {
    changed = false;
    iterations++;

    // Propagation through Connections
    for (const conn of project.connections) {
      const srcKey = `${conn.sourceDeviceId}:${conn.sourceChannelId}`;
      const srcState = state[srcKey];
      if (!srcState) continue;

      const destDevice = project.devices.find(d => d.id === conn.destinationDeviceId);
      const destChannel = destDevice?.inputChannels.find(c => c.id === conn.destinationChannelId);
      if (!destChannel) continue;

      // Propagation: destination effective name is its manual name OR source effective name
      // ONLY propagate if destChannel name is blank/null/generic
      const destName = destChannel.name;
      const isDestGeneric = !destName || destName.match(/^Ch \d+$/i);
      
      const effectiveName = isDestGeneric ? srcState.effectiveName : destName;
      const destKey = `${conn.destinationDeviceId}:${conn.destinationChannelId}`;
      const existing = state[destKey];

      if (!existing || existing.effectiveName !== effectiveName) {
        state[destKey] = {
          ...srcState,
          effectiveName,
          // Build path - don't duplicate if already there
          path: srcState.path.includes(conn.destinationDeviceId) 
            ? srcState.path 
            : [...srcState.path, conn.destinationDeviceId],
        };
        changed = true;
      }
    }

    // Internal Device Routing/Propagation
    for (const device of project.devices) {
      // Passthrough for simple devices (e.g. DI box or Adapter)
      if (isSimpleDevice(device)) {
        if (device.inputChannels.length === 1 && device.outputChannels.length === 1) {
          const inKey = `${device.id}:${device.inputChannels[0].id}`;
          const inState = state[inKey];
          if (inState) {
            const outChan = device.outputChannels[0];
            const outKey = `${device.id}:${outChan.id}`;
            
            const outName = outChan.name;
            const isOutGeneric = !outName || outName.match(/^Ch \d+$/i) || outName.toLowerCase() === 'output';
            const effectiveName = isOutGeneric ? inState.effectiveName : outName;
            
            const existing = state[outKey];
            if (!existing || existing.effectiveName !== effectiveName || existing.sourceDeviceId !== inState.sourceDeviceId) {
              state[outKey] = {
                ...inState,
                effectiveName,
                path: inState.path
              };
              changed = true;
            }
          }
        }
        continue;
      }

      // Complex Devices (Stageboxes, Mixers)
      for (const outChan of device.outputChannels) {
        let matchedInState: ChannelState | null = null;

        // A. Name-based match (Priority - Signal Flow follows effective names)
        // Match output manual name to an input's effective name
        if (outChan.name) {
          for (const inChan of device.inputChannels) {
            const inKey = `${device.id}:${inChan.id}`;
            const inState = state[inKey];
            if (inState && inState.effectiveName === outChan.name) {
              matchedInState = inState;
              break;
            }
          }
        }

        // B. Fallback to 1:1 number mapping ONLY for Stageboxes
        if (!matchedInState && device.type?.toLowerCase() === 'stagebox') {
          const inChan = device.inputChannels.find(c => c.number === outChan.number);
          if (inChan) {
            const inKey = `${device.id}:${inChan.id}`;
            const inState = state[inKey];
            if (inState) {
              matchedInState = inState;
            }
          }
        }

        if (matchedInState) {
          const outKey = `${device.id}:${outChan.id}`;
          
          const outName = outChan.name;
          const isOutGeneric = !outName || outName.match(/^Ch \d+$/i) || outName.toLowerCase() === 'output';
          const effectiveName = isOutGeneric ? matchedInState.effectiveName : outName;

          const existing = state[outKey];
          if (!existing || existing.effectiveName !== effectiveName || existing.sourceDeviceId !== matchedInState.sourceDeviceId) {
            state[outKey] = {
              ...matchedInState,
              effectiveName,
              path: matchedInState.path
            };
            changed = true;
          }
        }
      }
    }
  }

  return state;
}

/**
 * Calculates the channel mapping for a connection.
 */
export function resolveChannelMapping(
  conn: Connection,
  sourceChannel: Channel,
  destChannel: Channel
): Record<number, number> {
  const mapping: Record<number, number> = {};

  if (conn.channelMapping) {
    for (const [srcChan, destChan] of Object.entries(conn.channelMapping)) {
      mapping[parseInt(srcChan, 10)] = parseInt(destChan, 10);
    }
  } else {
    const count = Math.min(sourceChannel.channelCount, destChannel.channelCount);
    for (let i = 1; i <= count; i++) {
      mapping[i] = i;
    }
  }

  return mapping;
}

export function isSimpleDevice(device: Device): boolean {
  if (device.isSource) return true;
  
  const type = device.type?.toLowerCase();
  if (type === 'stagebox' || type === 'mixer' || type === 'console') return false;

  const totalChannels = device.inputChannels.length + device.outputChannels.length;
  // Mics, DIs, Speakers usually have 1-4 channels
  return totalChannels <= 4;
}

export interface SignalHop {
  deviceId: string;
  deviceName: string;
  inputChannelId?: string;
  inputChannelNumber?: number;
  inputChannelName?: string;
  inputEffectiveName?: string;
  outputChannelId?: string;
  outputChannelNumber?: number;
  outputChannelName?: string;
  outputEffectiveName?: string;
  connectorType?: string;
  cableLabel?: string;
  phantomPower?: boolean;
  pad?: boolean;
}

export interface TabularRow {
  index: number;
  sourceDeviceId: string;
  sourceDeviceName: string;
  sourceDeviceType: string;
  sourceDeviceModel?: string;
  sourceGroupId?: string;
  sourceCategoryId?: string;
  sourceChannelId: string;
  sourceChannelNumber: number;
  sourceEffectiveName: string;
  sourcePhantomPower?: boolean;
  sourcePad?: boolean;
  isSink?: boolean; // If true, this row starts from a complex device output (e.g., Mixer Out)
  hops: SignalHop[];
  fullPath: Record<string, SignalHop>;
  terminalDeviceId?: string;
  terminalDeviceName?: string;
  terminalDeviceType?: string;
  terminalChannelName?: string;
}

export function resolveTabularPatch(project: Project): TabularRow[] {
  const allRows: TabularRow[] = [];
  const signalState = resolveSignalChain(project);
  
  // 1. Generate Rows from Terminal Sources
  const terminalSources = project.devices.filter(d => isSimpleDevice(d));
  for (const device of terminalSources) {
    if (device.outputChannels.length === 0) continue;

    for (const channel of device.outputChannels) {
      const stateKey = `${device.id}:${channel.id}`;
      const chState = signalState[stateKey];
      if (!chState) continue;

      const row: TabularRow = {
        index: 0,
        sourceDeviceId: device.id,
        sourceDeviceName: device.name,
        sourceDeviceType: device.type,
        sourceDeviceModel: device.model,
        sourceGroupId: device.groupId,
        sourceCategoryId: device.categoryId,
        sourceChannelId: channel.id,
        sourceChannelNumber: channel.number,
        sourceEffectiveName: chState.effectiveName || `Ch ${channel.number}`,
        sourcePhantomPower: channel.phantomPower,
        sourcePad: channel.pad,
        hops: [],
        fullPath: {}
      };

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

        const destInKey = `${destDevice.id}:${destChannel.id}`;
        const destInState = signalState[destInKey];

        const hop: SignalHop = {
          deviceId: destDevice.id,
          deviceName: destDevice.name,
          inputChannelId: destChannel.id,
          inputChannelNumber: destChannel.number,
          inputChannelName: destChannel.name,
          inputEffectiveName: destInState?.effectiveName,
          connectorType: destChannel.connectorType,
          cableLabel: connection.cableLabel,
          phantomPower: destChannel.phantomPower,
          pad: destChannel.pad
        };

        if (!isSimpleDevice(destDevice)) {
          // Find matching output based on signalState AND name matching
          const matchingOutChan = destDevice.outputChannels.find(out => {
            const outKey = `${destDevice.id}:${out.id}`;
            const outState = signalState[outKey];
            
            if (!outState) return false;

            // It must come from the same source
            const sourceMatch = outState.sourceDeviceId === chState.sourceDeviceId && 
                               outState.sourceChannelId === chState.sourceChannelId;
            
            if (destDevice.name === 'Mixer') {
                console.log(`[DEBUG] Mixer Check: outId=${out.id} sourceMatch=${sourceMatch} outState.effectiveName=${outState.effectiveName} destInState.effectiveName=${destInState?.effectiveName}`);
            }

            if (!sourceMatch) return false;

            // FOR A ROW TO CONTINUE, the effective name must match exactly.
            // If the name changed (e.g. at a Mixer Output), the chain is broken into a new row.
            const match = outState.effectiveName === destInState?.effectiveName;
            if (!match && destDevice.name === 'Mixer') {
                console.log(`[DEBUG] Mixer Match Fail: outState.effectiveName=${outState.effectiveName} destInState.effectiveName=${destInState?.effectiveName}`);
            }
            return match;
          });

          if (matchingOutChan) {
            const outKey = `${destDevice.id}:${matchingOutChan.id}`;
            const outState = signalState[outKey];
            hop.outputChannelId = matchingOutChan.id;
            hop.outputChannelNumber = matchingOutChan.number;
            hop.outputChannelName = matchingOutChan.name;
            hop.outputEffectiveName = outState?.effectiveName;
            currentDeviceId = destDevice.id;
            currentChannelId = matchingOutChan.id;
          } else {
            // Name change or no route - chain ends at the input of this complex device
            currentDeviceId = "";
            currentChannelId = "";
          }
          row.hops.push(hop);
          row.fullPath[hop.deviceId] = hop;
        } else {
          row.terminalDeviceId = destDevice.id;
          row.terminalDeviceName = destDevice.name;
          row.terminalDeviceType = destDevice.type;
          row.terminalChannelName = destChannel.name || destInState?.effectiveName || `Ch ${destChannel.number}`;
          break;
        }
        if (!currentDeviceId) break;
      }
      allRows.push(row);
    }
  }

  // 2. Generate Rows from Complex Device Outputs that are NOT reached by terminal sources with matching names
  const complexDevices = project.devices.filter(d => !isSimpleDevice(d));
  for (const device of complexDevices) {
    for (const channel of device.outputChannels) {
      const stateKey = `${device.id}:${channel.id}`;
      const chState = signalState[stateKey];
      
      // If this output has a chState, check if it's considered a seed for its row
      // It's a seed IF it's the source of its own signal chain OR its name changed from the input
      if (chState && chState.sourceDeviceId !== device.id) {
          // If the name propagated perfectly from a source, we don't start a new row here
          // (The row already exists from the source)
          continue;
      }
      
      // SKIP if no name and no connection (uninteresting orphan)
      const isConnected = project.connections.some(c => c.sourceDeviceId === device.id && c.sourceChannelId === channel.id);
      if (!isConnected && !channel.name) continue;

      const row: TabularRow = {
        index: 0,
        sourceDeviceId: device.id,
        sourceDeviceName: device.name,
        sourceDeviceType: device.type,
        sourceChannelId: channel.id,
        sourceChannelNumber: channel.number,
        sourceEffectiveName: chState?.effectiveName || channel.name || `Ch ${channel.number}`,
        isSink: true,
        hops: [],
        fullPath: {}
      };

      const startHop: SignalHop = {
        deviceId: device.id,
        deviceName: device.name,
        outputChannelId: channel.id,
        outputChannelNumber: channel.number,
        outputChannelName: channel.name,
        outputEffectiveName: chState?.effectiveName,
        phantomPower: channel.phantomPower,
        pad: channel.pad
      };
      row.hops.push(startHop);
      row.fullPath[device.id] = startHop;

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

        const destInKey = `${destDevice.id}:${destChannel.id}`;
        const destInState = signalState[destInKey];

        const hop: SignalHop = {
          deviceId: destDevice.id,
          deviceName: destDevice.name,
          inputChannelId: destChannel.id,
          inputChannelNumber: destChannel.number,
          inputChannelName: destChannel.name,
          inputEffectiveName: destInState?.effectiveName,
          connectorType: destChannel.connectorType,
          cableLabel: connection.cableLabel
        };

        if (!isSimpleDevice(destDevice)) {
          const matchingOutChan = destDevice.outputChannels.find(out => {
             const outKey = `${destDevice.id}:${out.id}`;
             const outState = signalState[outKey];
             if (outState && destInState) {
                return outState.sourceDeviceId === (chState?.sourceDeviceId || device.id) && 
                       outState.sourceChannelId === (chState?.sourceChannelId || channel.id) &&
                       outState.path.indexOf(destDevice.id) === outState.path.length - 1;
             }
             if (out.name && out.name === (destChannel.name || row.sourceEffectiveName)) return true;
             return out.number === destChannel.number;
          });

          if (matchingOutChan) {
            const outKey = `${destDevice.id}:${matchingOutChan.id}`;
            const outState = signalState[outKey];
            hop.outputChannelId = matchingOutChan.id;
            hop.outputChannelNumber = matchingOutChan.number;
            hop.outputChannelName = matchingOutChan.name;
            hop.outputEffectiveName = outState?.effectiveName;
            currentDeviceId = destDevice.id;
            currentChannelId = matchingOutChan.id;
          } else {
            currentDeviceId = "";
            currentChannelId = "";
          }
          row.hops.push(hop);
          row.fullPath[hop.deviceId] = hop;
        } else {
          row.terminalDeviceId = destDevice.id;
          row.terminalDeviceName = destDevice.name;
          row.terminalDeviceType = destDevice.type;
          row.terminalChannelName = destChannel.name || destInState?.effectiveName || `Ch ${destChannel.number}`;
          break;
        }
        if (!currentDeviceId) break;
      }
      allRows.push(row);
    }
  }

  // 3. Generate Rows from Complex Device Inputs that have NO incoming connection
  for (const device of complexDevices) {
    if (device.type?.toLowerCase() === 'stagebox') {
      for (const channel of device.inputChannels) {
        const isConnected = project.connections.some(c => c.destinationDeviceId === device.id && c.destinationChannelId === channel.id);
        if (!isConnected) {
          const row: TabularRow = {
            index: 0,
            sourceDeviceId: device.id,
            sourceDeviceName: device.name,
            sourceDeviceType: device.type,
            sourceDeviceModel: device.model,
            sourceGroupId: device.groupId,
            sourceCategoryId: device.categoryId,
            sourceChannelId: channel.id,
            sourceChannelNumber: channel.number,
            sourceEffectiveName: channel.name || `Ch ${channel.number}`,
            sourcePhantomPower: channel.phantomPower,
            sourcePad: channel.pad,
            hops: [],
            fullPath: {}
          };

          // Try to follow the signal from this input
          let currentDeviceId = device.id;
          let currentChannelId = channel.id;
          let visited = new Set<string>();

          // Add initial hop for the source device itself if it's complex
          const startHop: SignalHop = {
            deviceId: device.id,
            deviceName: device.name,
            inputChannelId: channel.id,
            inputChannelNumber: channel.number,
            inputChannelName: channel.name,
            inputEffectiveName: channel.name || `Ch ${channel.number}`,
            phantomPower: channel.phantomPower,
            pad: channel.pad
          };
          
          // Find if there's an internal route to an output
          const matchingOutChan = device.outputChannels.find(out => {
             // For stageboxes, we assume 1:1 if no explicit mapping
             return out.number === channel.number;
          });

          if (matchingOutChan) {
            startHop.outputChannelId = matchingOutChan.id;
            startHop.outputChannelNumber = matchingOutChan.number;
            startHop.outputChannelName = matchingOutChan.name;
            startHop.outputEffectiveName = matchingOutChan.name || channel.name || `Ch ${channel.number}`;
            currentDeviceId = device.id;
            currentChannelId = matchingOutChan.id;
          }
          
          row.hops.push(startHop);
          row.fullPath[device.id] = startHop;

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

            const destInKey = `${destDevice.id}:${destChannel.id}`;
            const destInState = signalState[destInKey];

            const hop: SignalHop = {
              deviceId: destDevice.id,
              deviceName: destDevice.name,
              inputChannelId: destChannel.id,
              inputChannelNumber: destChannel.number,
              inputChannelName: destChannel.name,
              inputEffectiveName: destInState?.effectiveName || destChannel.name || `Ch ${destChannel.number}`,
              connectorType: destChannel.connectorType,
              cableLabel: connection.cableLabel
            };

            if (!isSimpleDevice(destDevice)) {
              const matchingOutChan = destDevice.outputChannels.find(out => {
                 const outKey = `${destDevice.id}:${out.id}`;
                 const outState = signalState[outKey];
                 if (outState && destInState) {
                    return outState.sourceDeviceId === device.id && 
                           outState.sourceChannelId === channel.id;
                 }
                 if (out.name && out.name === (destChannel.name || row.sourceEffectiveName)) return true;
                 return out.number === destChannel.number;
              });

              if (matchingOutChan) {
                const outKey = `${destDevice.id}:${matchingOutChan.id}`;
                const outState = signalState[outKey];
                hop.outputChannelId = matchingOutChan.id;
                hop.outputChannelNumber = matchingOutChan.number;
                hop.outputChannelName = matchingOutChan.name;
                hop.outputEffectiveName = outState?.effectiveName || matchingOutChan.name || `Ch ${matchingOutChan.number}`;
                currentDeviceId = destDevice.id;
                currentChannelId = matchingOutChan.id;
              } else {
                currentDeviceId = "";
                currentChannelId = "";
              }
              row.hops.push(hop);
              row.fullPath[hop.deviceId] = hop;
            } else {
              row.terminalDeviceId = destDevice.id;
              row.terminalDeviceName = destDevice.name;
              row.terminalDeviceType = destDevice.type;
              row.terminalChannelName = destChannel.name || destInState?.effectiveName || `Ch ${destChannel.number}`;
              break;
            }
            if (!currentDeviceId) break;
          }
          allRows.push(row);
        }
      }
    }
  }

  // 4. Sorting logic: terminal sources first, then complex device output rows
  allRows.sort((a, b) => {
    // 1. Sort by the "Primary" complex device (e.g., Stagebox)
    const getPrimarySortInfo = (row: TabularRow) => {
        // PREFER STAGEBOX: Look for ANY Stagebox in the hops first
        const stageboxHop = row.hops.find(h => {
            const d = project.devices.find(dev => dev.id === h.deviceId);
            return d?.type?.toLowerCase() === 'stagebox';
        });
        
        if (stageboxHop) {
            return {
                name: stageboxHop.deviceName,
                number: stageboxHop.inputChannelNumber || stageboxHop.outputChannelNumber || 0,
                type: 'Stagebox',
                id: stageboxHop.deviceId
            };
        }

        // If the source itself is a Stagebox, it's the primary device
        const sourceDev = project.devices.find(d => d.id === row.sourceDeviceId);
        if (sourceDev && sourceDev.type?.toLowerCase() === 'stagebox') {
             return {
                 name: sourceDev.name,
                 number: row.sourceChannelNumber,
                 type: 'Stagebox',
                 id: sourceDev.id
             };
        }

        // Fallback to first complex device
        if (sourceDev && !isSimpleDevice(sourceDev) && !row.isSink) {
             return {
                 name: sourceDev.name,
                 number: row.sourceChannelNumber,
                 type: sourceDev.type,
                 id: sourceDev.id
             };
        }

        const complexHop = row.hops.find(h => {
            const d = project.devices.find(dev => dev.id === h.deviceId);
            return d && !isSimpleDevice(d);
        });

        if (complexHop) {
            const d = project.devices.find(dev => dev.id === complexHop.deviceId);
            return {
                name: complexHop.deviceName,
                number: complexHop.inputChannelNumber || complexHop.outputChannelNumber || 0,
                type: d?.type || '',
                id: complexHop.deviceId
            };
        }

        return { name: row.sourceDeviceName, number: row.sourceChannelNumber, type: row.sourceDeviceType, id: row.sourceDeviceId };
    };

    const infoA = getPrimarySortInfo(a);
    const infoB = getPrimarySortInfo(b);

    // Prioritize Stageboxes over other devices (like Mixers)
    const isStageboxA = infoA.type.toLowerCase() === 'stagebox';
    const isStageboxB = infoB.type.toLowerCase() === 'stagebox';
    if (isStageboxA !== isStageboxB) {
        return isStageboxA ? -1 : 1;
    }

    if (infoA.name !== infoB.name) {
        return infoA.name.localeCompare(infoB.name);
    }

    // If same device, sort by number
    if (infoA.number !== infoB.number) {
        return infoA.number - infoB.number;
    }

    // If same device and number, then terminal sources (Inputs) first, then Sink rows (Outputs/Mixer Outs)
    if (!!a.isSink !== !!b.isSink) {
      return a.isSink ? 1 : -1;
    }

    // Fallback: Sort by source device name and number
    if (a.sourceDeviceName !== b.sourceDeviceName) {
      return a.sourceDeviceName.localeCompare(b.sourceDeviceName);
    }
    
    return a.sourceChannelNumber - b.sourceChannelNumber;
  });

  allRows.forEach((r, i) => r.index = i + 1);
  return allRows;
}

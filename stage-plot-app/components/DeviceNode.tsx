import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  SharedValue,
  runOnJS
} from 'react-native-reanimated';
import { Device, Channel } from '../models';
import { Mic, Speaker, Box, Settings, Music, MoreVertical } from 'lucide-react-native';
import { ChannelDot } from './ChannelDot';

export function shouldShowChannelNames(device: Device): boolean {
  // If explicitly set in metadata, respect that
  if (device.metadata.showChannelNames !== undefined) {
    return device.metadata.showChannelNames;
  }
  // Fallback: only show for devices with > 2 total channels
  const totalChannels = device.inputChannels.length + device.outputChannels.length;
  return totalChannels > 2;
}

export const NODE_LAYOUT = {
  BOX_PADDING: 4,
  HEADER_HEIGHT: 28,
  CHANNEL_GAP: 6,
  CHANNEL_ROW_HEIGHT: 16,
  TYPE_HEADER_HEIGHT: 12,
};

const groupChannels = (channels: Channel[]) => {
  return channels.reduce((acc, c) => {
    const type = c.connectorType || 'Analog';
    if (!acc[type]) acc[type] = [];
    acc[type].push(c);
    return acc;
  }, {} as Record<string, Channel[]>);
};

export function getNodeWidth(device: Device): number {
  return shouldShowChannelNames(device) ? 180 : 140;
}

export function getNodeHeight(device: Device): number {
  const P = NODE_LAYOUT.BOX_PADDING;
  const H = NODE_LAYOUT.HEADER_HEIGHT;
  if (!shouldShowChannelNames(device)) {
    const maxCh = Math.max(device.inputChannels.length, device.outputChannels.length, 1);
    // For devices without channel names, if 1 channel, it's centered. 
    // If 2 channels, they are spaced by CHANNEL_ROW_HEIGHT (16px) to match devices with names
    return P * 2 + H + (maxCh === 2 ? NODE_LAYOUT.CHANNEL_ROW_HEIGHT : 0);
  }
  const gi = groupChannels(device.inputChannels);
  const go = groupChannels(device.outputChannels);
  let ih = 0;
  Object.values(gi).forEach(chs => {
    ih += NODE_LAYOUT.TYPE_HEADER_HEIGHT + chs.length * NODE_LAYOUT.CHANNEL_ROW_HEIGHT;
  });
  let oh = 0;
  Object.values(go).forEach(chs => {
    oh += NODE_LAYOUT.TYPE_HEADER_HEIGHT + chs.length * NODE_LAYOUT.CHANNEL_ROW_HEIGHT;
  });
  return P * 2 + H + NODE_LAYOUT.CHANNEL_GAP + Math.max(ih, oh);
}

export function getChannelLayout(device: Device): Record<string, { y: number; isOutput: boolean }> {
  const showNames = shouldShowChannelNames(device);
  const layout: Record<string, { y: number; isOutput: boolean }> = {};
  const P = NODE_LAYOUT.BOX_PADDING;
  const H = NODE_LAYOUT.HEADER_HEIGHT;

  if (!showNames) {
    const baseY = P + H / 2;
    // Align dots with name-based device spacing (CHANNEL_ROW_HEIGHT = 16px)
    // If mono, center it. If stereo, offset from center by ±8px.
    const outCount = device.outputChannels.length;
    device.outputChannels.forEach((c, i) => {
      const offset = outCount === 2 ? (i === 0 ? -NODE_LAYOUT.CHANNEL_ROW_HEIGHT / 2 : NODE_LAYOUT.CHANNEL_ROW_HEIGHT / 2) : 0;
      layout[c.id] = { y: baseY + offset, isOutput: true };
    });
    const inCount = device.inputChannels.length;
    device.inputChannels.forEach((c, i) => {
      const offset = inCount === 2 ? (i === 0 ? -NODE_LAYOUT.CHANNEL_ROW_HEIGHT / 2 : NODE_LAYOUT.CHANNEL_ROW_HEIGHT / 2) : 0;
      layout[c.id] = { y: baseY + offset, isOutput: false };
    });
    return layout;
  }

  const gi = groupChannels(device.inputChannels);
  const go = groupChannels(device.outputChannels);
  let cy = P + H + NODE_LAYOUT.CHANNEL_GAP;
  Object.values(gi).forEach(chs => {
    cy += NODE_LAYOUT.TYPE_HEADER_HEIGHT;
    chs.forEach(c => {
      layout[c.id] = { y: cy + NODE_LAYOUT.CHANNEL_ROW_HEIGHT / 2, isOutput: false };
      cy += NODE_LAYOUT.CHANNEL_ROW_HEIGHT;
    });
  });
  cy = P + H + NODE_LAYOUT.CHANNEL_GAP;
  Object.values(go).forEach(chs => {
    cy += NODE_LAYOUT.TYPE_HEADER_HEIGHT;
    chs.forEach(c => {
      layout[c.id] = { y: cy + NODE_LAYOUT.CHANNEL_ROW_HEIGHT / 2, isOutput: true };
      cy += NODE_LAYOUT.CHANNEL_ROW_HEIGHT;
    });
  });
  return layout;
}

interface DeviceNodeProps {
  device: Device;
  isSelected?: boolean;
  onToggleSelection?: () => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSelect: (device: Device) => void;
  onStartConnection: (deviceId: string, channelId: string, x: number, y: number) => void;
  onUpdateConnection: (x: number, y: number) => void;
  onEndConnection: (deviceId: string, channelId: string, x: number, y: number) => void;
  onCancelConnection: () => void;
  canvasScale: SharedValue<number>;
}

const getIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'microphone': return Mic;
    case 'speaker': return Speaker;
    case 'stagebox': return Box;
    case 'mixer': return Settings;
    default: return Music;
  }
};

export function DeviceNode({
  device, isSelected, onToggleSelection, onPositionChange, onSelect,
  onStartConnection, onUpdateConnection, onEndConnection, onCancelConnection,
  canvasScale
}: DeviceNodeProps) {
  const translateX = useSharedValue(device.position?.x ?? 100);
  const translateY = useSharedValue(device.position?.y ?? 100);

  const showNames = shouldShowChannelNames(device);
  const nodeWidth = getNodeWidth(device);

  React.useEffect(() => {
    if (device.position) {
      translateX.value = device.position.x;
      translateY.value = device.position.y;
    }
  }, [device.position?.x, device.position?.y]);

  const Icon = getIcon(device.type);

  const traceDeviceDrag = (msg: string) => { console.log(`[DEVICE_DRAG:${device.name}]`, msg); };

  const dragGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onBegin(() => {
      'worklet';
      runOnJS(traceDeviceDrag)('begin');
    })
    .onChange((event) => {
      const s = canvasScale.value;
      translateX.value += event.changeX / s;
      translateY.value += event.changeY / s;
    })
    .onEnd(() => {
      translateX.value = Math.round(translateX.value / 10) * 10;
      translateY.value = Math.round(translateY.value / 10) * 10;
      runOnJS(traceDeviceDrag)(`end x=${translateX.value} y=${translateY.value}`);
      runOnJS(onPositionChange)(device.id, translateX.value, translateY.value);
    });

  const tapGesture = Gesture.Tap()
    .onEnd(() => {
      if (onToggleSelection) runOnJS(onToggleSelection)();
    });

  const composedGesture = Gesture.Exclusive(dragGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ] as any,
  }));

  const channelLayout = useMemo(() => getChannelLayout(device), [device]);

  const allChannels = useMemo(() => {
    const result: Array<{ channel: Channel; y: number; isOutput: boolean }> = [];
    device.inputChannels.forEach(c => {
      const info = channelLayout[c.id];
      if (info) result.push({ channel: c, y: info.y, isOutput: false });
    });
    device.outputChannels.forEach(c => {
      const info = channelLayout[c.id];
      if (info) result.push({ channel: c, y: info.y, isOutput: true });
    });
    return result;
  }, [device, channelLayout]);

  const groupedInputs = useMemo(() => groupChannels(device.inputChannels), [device.inputChannels]);
  const groupedOutputs = useMemo(() => groupChannels(device.outputChannels), [device.outputChannels]);

  const renderComplexChannels = () => {
    const inputEls: React.ReactNode[] = [];
    Object.entries(groupedInputs).forEach(([type, chs]) => {
      inputEls.push(
        <View key={`h-in-${type}`} style={{ height: NODE_LAYOUT.TYPE_HEADER_HEIGHT, justifyContent: 'center', paddingLeft: 12 }}>
          <Text style={styles.typeHeader}>{type}</Text>
        </View>
      );
      chs.forEach(c => {
        inputEls.push(
          <View key={c.id} style={{ height: NODE_LAYOUT.CHANNEL_ROW_HEIGHT, justifyContent: 'center', paddingLeft: 12 }}>
            <Text style={styles.channelName} numberOfLines={1}>{c.name || `Ch ${c.number}`}</Text>
          </View>
        );
      });
    });

    const outputEls: React.ReactNode[] = [];
    Object.entries(groupedOutputs).forEach(([type, chs]) => {
      outputEls.push(
        <View key={`h-out-${type}`} style={{ height: NODE_LAYOUT.TYPE_HEADER_HEIGHT, justifyContent: 'center', paddingRight: 12 }}>
          <Text style={[styles.typeHeader, { textAlign: 'right' }]}>{type}</Text>
        </View>
      );
      chs.forEach(c => {
        outputEls.push(
          <View key={c.id} style={{ height: NODE_LAYOUT.CHANNEL_ROW_HEIGHT, justifyContent: 'center', paddingRight: 12 }}>
            <Text style={[styles.channelName, { textAlign: 'right' }]} numberOfLines={1}>{c.name || `Ch ${c.number}`}</Text>
          </View>
        );
      });
    });

    return (
      <View style={{ flexDirection: 'row' }}>
        <View style={{ flex: 1 }}>{inputEls}</View>
        <View style={{ flex: 1, alignItems: 'flex-end' }}>{outputEls}</View>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container, 
        animatedStyle, 
        { width: nodeWidth },
        isSelected && { zIndex: 20 }
      ]}
      {...Platform.select({
        web: { onContextMenu: (e: any) => e.preventDefault() } as any,
        default: {}
      })}
    >
      <GestureDetector gesture={composedGesture}>
        <View style={[
          styles.box, 
          { width: nodeWidth },
          isSelected && { borderColor: '#3b82f6', borderWidth: 2, backgroundColor: '#eff6ff' }
        ]}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Icon size={12} color="#3b82f6" />
            </View>
            <View style={{ flex: 1, marginTop: -1 }}>
              <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
              {device.model ? (
                <Text style={styles.deviceModel} numberOfLines={1}>{device.model}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => onSelect(device)} hitSlop={8}>
              <MoreVertical size={14} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          {showNames && <View style={{ marginTop: NODE_LAYOUT.CHANNEL_GAP }}>{renderComplexChannels()}</View>}
        </View>
      </GestureDetector>
      {allChannels.map(({ channel, y, isOutput }) => (
        <ChannelDot
          key={channel.id}
          channel={channel}
          y={y}
          isOutput={isOutput}
          deviceId={device.id}
          nodeWidth={nodeWidth}
          translateX={translateX}
          translateY={translateY}
          canvasScale={canvasScale}
          onStartConnection={onStartConnection}
          onUpdateConnection={onUpdateConnection}
          onEndConnection={onEndConnection}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
    overflow: 'visible',
  },
  box: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: NODE_LAYOUT.BOX_PADDING,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      } as any,
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    height: NODE_LAYOUT.HEADER_HEIGHT,
    paddingTop: 2,
  },
  iconWrap: {
    padding: 2,
    backgroundColor: '#dbeafe',
    borderRadius: 4,
    marginRight: 4,
    marginTop: 1,
  },
  deviceName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  deviceModel: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: -1,
  },
  typeHeader: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  channelName: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
});

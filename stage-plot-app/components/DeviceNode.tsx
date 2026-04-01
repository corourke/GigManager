import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Platform, TouchableOpacity } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  runOnJS
} from 'react-native-reanimated';
import { Device, Channel } from '../models';
import { Mic, Speaker, Box, Settings, Music, MoreVertical } from 'lucide-react-native';

export function isSimpleDevice(device: { type: string; inputChannels: any[]; outputChannels: any[] }): boolean {
  const totalChannels = device.inputChannels.length + device.outputChannels.length;
  return totalChannels <= 2;
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
  return isSimpleDevice(device) ? 140 : 180;
}

export function getNodeHeight(device: Device): number {
  const P = NODE_LAYOUT.BOX_PADDING;
  const H = NODE_LAYOUT.HEADER_HEIGHT;
  if (isSimpleDevice(device)) {
    const maxCh = Math.max(device.inputChannels.length, device.outputChannels.length, 1);
    return P * 2 + H + Math.max(0, maxCh - 1) * 14;
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
  const isSimple = isSimpleDevice(device);
  const layout: Record<string, { y: number; isOutput: boolean }> = {};
  const P = NODE_LAYOUT.BOX_PADDING;
  const H = NODE_LAYOUT.HEADER_HEIGHT;

  if (isSimple) {
    const baseY = P + H / 2;
    device.outputChannels.forEach((c, i) => {
      layout[c.id] = { y: baseY + i * 14, isOutput: true };
    });
    device.inputChannels.forEach((c, i) => {
      layout[c.id] = { y: baseY + i * 14, isOutput: false };
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
  onPositionChange: (id: string, x: number, y: number) => void;
  onSelect: (device: Device) => void;
  onStartConnection: (deviceId: string, channelId: string, x: number, y: number) => void;
  onUpdateConnection: (x: number, y: number) => void;
  onEndConnection: (deviceId: string, channelId: string, x: number, y: number) => void;
  onCancelConnection: () => void;
  canvasWidth: number;
  canvasHeight: number;
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
  device, onPositionChange, onSelect,
  onStartConnection, onUpdateConnection, onEndConnection, onCancelConnection,
  canvasWidth, canvasHeight
}: DeviceNodeProps) {
  const translateX = useSharedValue(device.position?.x ?? 100);
  const translateY = useSharedValue(device.position?.y ?? 100);
  const context = useSharedValue({ x: 0, y: 0 });

  const isSimple = isSimpleDevice(device);
  const nodeWidth = getNodeWidth(device);

  React.useEffect(() => {
    if (device.position) {
      translateX.value = device.position.x;
      translateY.value = device.position.y;
    }
  }, [device.position?.x, device.position?.y]);

  const Icon = getIcon(device.type);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = Math.max(0, Math.min(context.value.x + event.translationX, canvasWidth - nodeWidth));
      translateY.value = Math.max(0, Math.min(context.value.y + event.translationY, canvasHeight - 60));
    })
    .onEnd(() => {
      runOnJS(onPositionChange)(device.id, translateX.value, translateY.value);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
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

  const renderDot = (channel: Channel, y: number, isOutput: boolean) => {
    const channelGesture = Gesture.Pan()
      .onBegin(() => {
        const x = translateX.value + (isOutput ? nodeWidth : 0);
        runOnJS(onStartConnection)(device.id, channel.id, x, translateY.value + y);
      })
      .onUpdate((event) => {
        const x = translateX.value + (isOutput ? nodeWidth : 0) + event.translationX;
        runOnJS(onUpdateConnection)(x, translateY.value + y + event.translationY);
      })
      .onEnd((event) => {
        const x = translateX.value + (isOutput ? nodeWidth : 0) + event.translationX;
        runOnJS(onEndConnection)(device.id, channel.id, x, translateY.value + y + event.translationY);
      });

    return (
      <GestureDetector key={channel.id} gesture={channelGesture}>
        <View
          style={[
            styles.dotTarget,
            isOutput ? { right: -8 } : { left: -8 },
            { top: y - 8 },
          ]}
        >
          <View style={[styles.dot, { backgroundColor: isOutput ? '#ef4444' : '#22c55e' }]} />
        </View>
      </GestureDetector>
    );
  };

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
      style={[styles.container, animatedStyle, { width: nodeWidth }]}
      {...Platform.select({
        web: { onContextMenu: (e: any) => e.preventDefault() } as any,
        default: {}
      })}
    >
      <GestureDetector gesture={dragGesture}>
        <View style={[styles.box, { width: nodeWidth }]}>
          <View style={styles.header}>
            <View style={styles.iconWrap}>
              <Icon size={12} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
              {device.model ? (
                <Text style={styles.deviceModel} numberOfLines={1}>{device.model}</Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={() => onSelect(device)} hitSlop={8}>
              <MoreVertical size={14} color="#9ca3af" />
            </TouchableOpacity>
          </View>
          {!isSimple && <View style={{ marginTop: NODE_LAYOUT.CHANNEL_GAP }}>{renderComplexChannels()}</View>}
        </View>
      </GestureDetector>
      {allChannels.map(({ channel, y, isOutput }) => renderDot(channel, y, isOutput))}
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  dotTarget: {
    position: 'absolute',
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
});

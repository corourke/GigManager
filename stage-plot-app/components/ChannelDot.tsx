import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  useSharedValue,
  SharedValue,
  runOnJS
} from 'react-native-reanimated';
import { Channel } from '../models';

interface ChannelDotProps {
  channel: Channel;
  y: number;
  isOutput: boolean;
  deviceId: string;
  nodeWidth: number;
  translateX: SharedValue<number>;
  translateY: SharedValue<number>;
  canvasScale: SharedValue<number>;
  onStartConnection: (deviceId: string, channelId: string, x: number, y: number) => void;
  onUpdateConnection: (x: number, y: number) => void;
  onEndConnection: (deviceId: string, channelId: string, x: number, y: number) => void;
}

export function ChannelDot({
  channel, y, isOutput, deviceId, nodeWidth,
  translateX, translateY, canvasScale,
  onStartConnection, onUpdateConnection, onEndConnection
}: ChannelDotProps) {
  const sumX = useSharedValue(0);
  const sumY = useSharedValue(0);

  const channelGesture = Gesture.Pan()
    .minPointers(1)
    .maxPointers(1)
    .onBegin(() => {
      sumX.value = 0;
      sumY.value = 0;
      const x = translateX.value + (isOutput ? nodeWidth : 0);
      runOnJS(onStartConnection)(deviceId, channel.id, x, translateY.value + y);
    })
    .onChange((event) => {
      const s = canvasScale.value;
      sumX.value += event.changeX / s;
      sumY.value += event.changeY / s;
      const x = translateX.value + (isOutput ? nodeWidth : 0) + sumX.value;
      const cy = translateY.value + y + sumY.value;
      runOnJS(onUpdateConnection)(x, cy);
    })
    .onEnd(() => {
      const x = translateX.value + (isOutput ? nodeWidth : 0) + sumX.value;
      const cy = translateY.value + y + sumY.value;
      runOnJS(onEndConnection)(deviceId, channel.id, x, cy);
    });

  return (
    <GestureDetector gesture={channelGesture}>
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
}

const styles = StyleSheet.create({
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

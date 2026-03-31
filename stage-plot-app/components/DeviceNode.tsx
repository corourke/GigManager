import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  runOnJS
} from 'react-native-reanimated';
import { Device, Port } from '../models';
import { Mic, Speaker, Box, Settings, Music, MoreVertical } from 'lucide-react-native';

interface DeviceNodeProps {
  device: Device;
  onPositionChange: (id: string, x: number, y: number) => void;
  onSelect: (device: Device) => void;
  onStartConnection: (deviceId: string, portId: string, x: number, y: number) => void;
  onUpdateConnection: (x: number, y: number) => void;
  onEndConnection: (deviceId: string, portId: string, x: number, y: number) => void;
  onCancelConnection: () => void;
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
  device, 
  onPositionChange, 
  onSelect,
  onStartConnection,
  onUpdateConnection,
  onEndConnection,
  onCancelConnection
}: DeviceNodeProps) {
  const translateX = useSharedValue(device.position.x);
  const translateY = useSharedValue(device.position.y);
  const context = useSharedValue({ x: 0, y: 0 });

  const Icon = getIcon(device.type);

  const dragGesture = Gesture.Pan()
    .onStart(() => {
      context.value = { x: translateX.value, y: translateY.value };
    })
    .onUpdate((event) => {
      translateX.value = context.value.x + event.translationX;
      translateY.value = context.value.y + event.translationY;
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

  const renderPort = (port: Port, isOutput: boolean, index: number) => {
    const portGesture = Gesture.Pan()
      .onBegin(() => {
        const x = translateX.value + (isOutput ? 160 : 0);
        const y = translateY.value + 60 + (index * 24);
        runOnJS(onStartConnection)(device.id, port.id, x, y);
      })
      .onUpdate((event) => {
        const x = translateX.value + (isOutput ? 160 : 0) + event.translationX;
        const y = translateY.value + 60 + (index * 24) + event.translationY;
        runOnJS(onUpdateConnection)(x, y);
      })
      .onEnd((event) => {
        const x = translateX.value + (isOutput ? 160 : 0) + event.translationX;
        const y = translateY.value + 60 + (index * 24) + event.translationY;
        runOnJS(onEndConnection)(device.id, port.id, x, y);
      });

    return (
      <View key={port.id} className={`flex-row items-center mb-2 ${isOutput ? 'justify-end' : ''}`}>
        {!isOutput && (
          <GestureDetector gesture={portGesture}>
            <View className="w-8 h-8 items-center justify-center -ml-8 pr-2 bg-transparent">
              <View className="w-3 h-3 rounded-full bg-green-500 border border-white dark:border-gray-900" />
            </View>
          </GestureDetector>
        )}
        <Text className="text-[10px] text-gray-500">{port.name || `${isOutput ? 'Out' : 'In'} ${port.number}`}</Text>
        {isOutput && (
          <GestureDetector gesture={portGesture}>
            <View className="w-8 h-8 items-center justify-center -mr-8 pl-2 bg-transparent">
              <View className="w-3 h-3 rounded-full bg-red-500 border border-white dark:border-gray-900" />
            </View>
          </GestureDetector>
        )}
      </View>
    );
  };

  return (
    <Animated.View 
      style={[styles.container, animatedStyle]}
      {...Platform.select({
        web: { onContextMenu: (e: any) => e.preventDefault() } as any,
        default: {}
      })}
    >
      <GestureDetector gesture={dragGesture}>
        <View 
          className="bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-lg p-3 w-40"
        >
          <View className="flex-row items-center mb-2">
            <View className="p-2 bg-blue-100 dark:bg-blue-900 rounded-md mr-2">
              <Icon size={18} color="#3b82f6" />
            </View>
            <Text className="text-black dark:text-white font-bold flex-1" numberOfLines={1}>
              {device.name}
            </Text>
            <MoreVertical size={14} color="#9ca3af" />
          </View>
          
          <View className="flex-row justify-between">
            <View>
              {device.inputPorts.map((p, i) => renderPort(p, false, i))}
            </View>
            <View className="items-end">
              {device.outputPorts.map((p, i) => renderPort(p, true, i))}
            </View>
          </View>
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
  },
});

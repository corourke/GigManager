import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, Text } from 'react-native';
import Svg, { Line, Marker, Path, Defs } from 'react-native-svg';
import { useProject } from '../../contexts/ProjectContext';
import { DeviceNode } from '../../components/DeviceNode';
import { Plus, Maximize, Minimize, Settings } from 'lucide-react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DiagramScreen() {
  const { project, updateDevice, addConnection } = useProject();
  const [zoom, setZoom] = useState(1);
  const [activeConnection, setActiveConnection] = useState<{
    startDeviceId: string;
    startPortId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  const handlePositionChange = useCallback((id: string, x: number, y: number) => {
    updateDevice(id, { position: { x, y } });
  }, [updateDevice]);

  const handleStartConnection = (deviceId: string, portId: string, x: number, y: number) => {
    setActiveConnection({
      startDeviceId: deviceId,
      startPortId: portId,
      startX: x,
      startY: y,
      currentX: x,
      currentY: y,
    });
  };

  const handleUpdateConnection = (x: number, y: number) => {
    setActiveConnection(prev => prev ? { ...prev, currentX: x, currentY: y } : null);
  };

  const handleEndConnection = (deviceId: string, portId: string) => {
    if (activeConnection && activeConnection.startDeviceId !== deviceId) {
      addConnection({
        sourceDeviceId: activeConnection.startDeviceId,
        sourcePortId: activeConnection.startPortId,
        destinationDeviceId: deviceId,
        destinationPortId: portId,
      });
    }
    setActiveConnection(null);
  };

  const handleCancelConnection = () => {
    setActiveConnection(null);
  };

  const renderConnections = () => {
    return project.connections.map(connection => {
      const sourceDevice = project.devices.find(d => d.id === connection.sourceDeviceId);
      const destDevice = project.devices.find(d => d.id === connection.destinationDeviceId);

      if (!sourceDevice || !destDevice) return null;

      // Simplified connection point logic: from center-right of source to center-left of destination
      // A more robust logic would calculate port-specific coordinates
      const x1 = sourceDevice.position.x + 160; // w-40 = 160
      const y1 = sourceDevice.position.y + 40;  // roughly center vertically
      const x2 = destDevice.position.x;
      const y2 = destDevice.position.y + 40;

      return (
        <React.Fragment key={connection.id}>
          <Line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#3b82f6"
            strokeWidth="2"
            markerEnd="url(#arrowhead)"
          />
        </React.Fragment>
      );
    });
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      {/* Tool Bar */}
      <View className="flex-row items-center justify-between px-6 pt-12 pb-4 bg-white dark:bg-gray-900 shadow-sm z-50">
        <Text className="text-2xl font-bold text-black dark:text-white">Diagram</Text>
        <View className="flex-row">
          <TouchableOpacity className="p-2 mr-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Maximize size={20} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Plus size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 overflow-hidden">
        <Svg style={StyleSheet.absoluteFill}>
          <Defs>
            <Marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto"
            >
              <Path d="M0,0 L0,7 L10,3.5 Z" fill="#3b82f6" />
            </Marker>
          </Defs>
          {renderConnections()}
          {activeConnection && (
            <Line
              x1={activeConnection.startX}
              y1={activeConnection.startY}
              x2={activeConnection.currentX}
              y2={activeConnection.currentY}
              stroke="#3b82f6"
              strokeWidth="2"
              strokeDasharray="5,5"
            />
          )}
        </Svg>
        
        {project.devices.map(device => (
          <DeviceNode
            key={device.id}
            device={device}
            onPositionChange={handlePositionChange}
            onSelect={() => {}}
            onStartConnection={handleStartConnection}
            onUpdateConnection={handleUpdateConnection}
            onEndConnection={handleEndConnection}
            onCancelConnection={handleCancelConnection}
          />
        ))}
      </View>

      {/* Floating Controls */}
      <View className="absolute bottom-8 right-6 flex-col">
        <TouchableOpacity className="w-12 h-12 mb-3 bg-white dark:bg-gray-800 rounded-full items-center justify-center shadow-md">
          <Maximize size={24} color="#6b7280" />
        </TouchableOpacity>
        <TouchableOpacity className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full items-center justify-center shadow-md">
          <Minimize size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

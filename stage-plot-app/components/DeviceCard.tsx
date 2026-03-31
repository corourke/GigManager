import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Device, Group, Category } from '../models';
import { Pencil, Trash2, Hash } from 'lucide-react-native';

interface DeviceCardProps {
  device: Device;
  group?: Group;
  category?: Category;
  onEdit: (device: Device) => void;
  onDelete: (id: string) => void;
}

export function DeviceCard({ device, group, category, onEdit, onDelete }: DeviceCardProps) {
  const isTerminalSource = device.type === 'Microphone' || device.type === 'DI Box' || device.type === 'Instrument';
  
  return (
    <View className="bg-white dark:bg-gray-900 rounded-xl p-3 mb-2 shadow-sm border border-gray-100 dark:border-gray-800">
      <View className="flex-row justify-between items-center">
        <View className="flex-1">
          <View className="flex-row items-center mb-0.5">
            <Text className="text-base font-bold text-black dark:text-white mr-2">
              {device.name}
            </Text>
            {isTerminalSource && device.metadata.specificType && (
              <Text className="text-sm text-gray-400 font-medium">
                ({device.metadata.specificType})
              </Text>
            )}
            {category && (
              <View 
                className="px-2 py-0.5 rounded-md ml-2" 
                style={{ backgroundColor: category.color || '#e2e8f0' }}
              >
                <Text className="text-[10px] font-bold text-gray-700 uppercase">
                  {category.name}
                </Text>
              </View>
            )}
          </View>
          
          <View className="flex-row items-center">
            <Text className="text-xs text-gray-500 mr-3">
              {device.type} {group ? `• ${group.name}` : ''}
            </Text>
            <View className="flex-row items-center">
              <Text className="text-[10px] text-gray-400 font-bold uppercase">
                {device.inputPorts.length} IN / {device.outputPorts.length} OUT
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => onEdit(device)}
            className="p-2 bg-gray-50 dark:bg-gray-800 rounded-lg mr-1.5"
          >
            <Pencil size={16} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => onDelete(device.id)}
            className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg"
          >
            <Trash2 size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

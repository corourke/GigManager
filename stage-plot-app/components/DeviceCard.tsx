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

export const DeviceCard = React.memo(({ device, group, category, onEdit, onDelete }: DeviceCardProps) => {
  const isTerminalSource = device.type === 'Microphone' || device.type === 'DI Box' || device.type === 'Instrument';
  
  return (
    <View 
      nativeID={`device-card-${device.id}`}
      className="bg-white dark:bg-gray-900 rounded-xl py-1 mb-2 mx-1 shadow-sm border border-gray-100 dark:border-gray-800"
    >
      <View 
        nativeID={`device-card-content-${device.id}`}
        className="flex-row justify-between items-center py-1 px-1"
      >
        <View 
          nativeID={`device-card-info-${device.id}`}
          className="flex-1"
        >
          <View 
            nativeID={`device-card-header-${device.id}`}
            className="flex-row items-center mb-0.5"
          >
            <Text className="text-[14px] font-bold text-black dark:text-white mr-2">
              {device.name}
            </Text>
            {device.model && (
              <Text className="text-[13px] text-gray-400 font-medium">
                ({device.model})
              </Text>
            )}
            {category && (
              <View 
                nativeID={`device-card-category-${device.id}`}
                className="px-2 py-0.5 rounded-md ml-2 border" 
                style={{ 
                  backgroundColor: (category.color || '#e2e8f0') + '66', // 66 is approx 40% opacity hex, but user asked for 60% transparent which means 40% opacity
                  borderColor: category.color || '#e2e8f0'
                }}
              >
                <Text 
                  className="text-[11px] font-bold uppercase"
                  style={{ color: category.color || '#475569' }}
                >
                  {category.name}
                </Text>
              </View>
            )}
          </View>
          
          <View 
            nativeID={`device-card-details-${device.id}`}
            className="flex-row items-center"
          >
            <Text className="text-[12px] text-gray-500 mr-3">
              {device.type}
            </Text>
            <View 
              nativeID={`device-card-channels-${device.id}`}
              className="flex-row items-center"
            >
              <Text className="text-[11px] text-gray-400 font-bold uppercase">
                {device.inputChannels.length} IN / {device.outputChannels.length} OUT
              </Text>
            </View>
          </View>
        </View>

        <View 
          nativeID={`device-card-actions-${device.id}`}
          className="flex-row items-center"
        >
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
});

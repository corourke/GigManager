import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { useProject } from '../../contexts/ProjectContext';
import { resolveSignalChain } from '../../utils/signalChain';
import { Device, Connection } from '../../models';
import { ChevronDown, ChevronUp, Search, Filter } from 'lucide-react-native';

type Perspective = 'Stage' | 'FOH' | 'Monitor World';

export default function PatchScreen() {
  const { project } = useProject();
  const [perspective, setPerspective] = useState<Perspective>('Stage');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('source');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const signalChain = useMemo(() => resolveSignalChain(project), [project]);

  const patchData = useMemo(() => {
    return project.connections.map((conn) => {
      const sourceDevice = project.devices.find((d) => d.id === conn.sourceDeviceId);
      const destDevice = project.devices.find((d) => d.id === conn.destinationDeviceId);
      const sourceChannel = sourceDevice?.outputChannels.find((c) => c.id === conn.sourceChannelId);
      const destChannel = destDevice?.inputChannels.find((c) => c.id === conn.destinationChannelId);

      const sourceKey = `${conn.sourceDeviceId}:${conn.sourceChannelId}`;
      const destKey = `${conn.destinationDeviceId}:${conn.destinationChannelId}`;

      const sourceEffectiveName = signalChain[sourceKey]?.effectiveName || sourceDevice?.metadata?.generalName || sourceDevice?.name || 'Unknown';
      const destEffectiveName = signalChain[destKey]?.effectiveName || destDevice?.name || 'Unknown';

      return {
        id: conn.id,
        source: sourceDevice?.name || 'Unknown',
        sourceChannel: sourceChannel?.number || '?',
        destination: destDevice?.name || 'Unknown',
        destChannel: destChannel?.number || '?',
        effectiveName: sourceEffectiveName,
        cableLabel: conn.cableLabel || '',
        perspectiveInfo: {
          Stage: sourceEffectiveName,
          FOH: destEffectiveName,
          'Monitor World': sourceEffectiveName, // Placeholder
        },
      };
    });
  }, [project, signalChain]);

  const filteredData = useMemo(() => {
    let data = patchData.filter((item) => {
      const searchStr = `${item.source} ${item.destination} ${item.effectiveName} ${item.cableLabel}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });

    data.sort((a, b) => {
      const valA = (a as any)[sortField];
      const valB = (b as any)[sortField];

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [patchData, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} color="#666" /> : <ChevronDown size={14} color="#666" />;
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-black">
      <StatusBar barStyle="default" />
      <View className="px-6 pt-2 pb-2 bg-white dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-zinc-800">
        <Text className="text-xl font-bold text-black dark:text-white mb-4">Patch</Text>
        <View className="flex-row items-center bg-white dark:bg-zinc-900 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-800 mb-4">
          <Search size={18} color="#666" />
          <TextInput
            className="flex-1 ml-2 text-black dark:text-white"
            placeholder="Search patch..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#666"
          />
        </View>

        <View className="flex-row justify-between">
          {(['Stage', 'FOH', 'Monitor World'] as Perspective[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPerspective(p)}
              className={`px-4 py-2 rounded-full ${
                perspective === p ? 'bg-blue-600' : 'bg-gray-200 dark:bg-zinc-800'
              }`}
            >
              <Text className={`font-medium ${perspective === p ? 'text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView horizontal>
        <View>
          <View className="flex-row bg-gray-100 dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800">
            <TouchableOpacity onPress={() => toggleSort('source')} className="w-40 p-3 flex-row items-center">
              <Text className="font-bold mr-1 text-gray-700 dark:text-gray-300">Source</Text>
              {renderSortIcon('source')}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSort('sourceChannel')} className="w-20 p-3 flex-row items-center">
              <Text className="font-bold mr-1 text-gray-700 dark:text-gray-300">Ch</Text>
              {renderSortIcon('sourceChannel')}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSort('destination')} className="w-40 p-3 flex-row items-center">
              <Text className="font-bold mr-1 text-gray-700 dark:text-gray-300">Destination</Text>
              {renderSortIcon('destination')}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSort('destChannel')} className="w-20 p-3 flex-row items-center">
              <Text className="font-bold mr-1 text-gray-700 dark:text-gray-300">Ch</Text>
              {renderSortIcon('destChannel')}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSort('effectiveName')} className="w-48 p-3 flex-row items-center">
              <Text className="font-bold mr-1 text-gray-700 dark:text-gray-300">Label ({perspective})</Text>
              {renderSortIcon('effectiveName')}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleSort('cableLabel')} className="w-32 p-3 flex-row items-center">
              <Text className="font-bold mr-1 text-gray-700 dark:text-gray-300">Cable</Text>
              {renderSortIcon('cableLabel')}
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1">
            {filteredData.map((item) => (
              <View key={item.id} className="flex-row border-b border-gray-100 dark:border-zinc-900 bg-white dark:bg-zinc-950">
                <View className="w-40 p-3">
                  <Text className="text-black dark:text-white" numberOfLines={1}>{item.source}</Text>
                </View>
                <View className="w-20 p-3">
                  <Text className="text-gray-600 dark:text-gray-400">{item.sourceChannel}</Text>
                </View>
                <View className="w-40 p-3">
                  <Text className="text-black dark:text-white" numberOfLines={1}>{item.destination}</Text>
                </View>
                <View className="w-20 p-3">
                  <Text className="text-gray-600 dark:text-gray-400">{item.destChannel}</Text>
                </View>
                <View className="w-48 p-3">
                  <Text className="font-medium text-blue-600 dark:text-blue-400" numberOfLines={1}>
                    {item.perspectiveInfo[perspective]}
                  </Text>
                </View>
                <View className="w-32 p-3">
                  <Text className="text-gray-500 dark:text-gray-500 italic" numberOfLines={1}>{item.cableLabel || '-'}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

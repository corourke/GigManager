import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { useProject } from '../../contexts/ProjectContext';
import { resolveTabularPatch, TabularRow, SignalHop, isSimpleDevice } from '../../utils/signalChain';
import { Device, Connection } from '../../models';
import { Search, Plus, X, Settings2, ArrowRightLeft, ArrowUpRight, ArrowDownLeft } from 'lucide-react-native';

const COLUMN_WIDTH = 256;

export default function PatchScreen() {
  const { project } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Complex devices are non-simple devices (Stageboxes, Mixers, etc.)
  const complexDevices = useMemo(() => 
    project.devices.filter(d => !isSimpleDevice(d)),
    [project]
  );

  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  
  // Initialize selectedDeviceIds when complexDevices are first loaded
  React.useEffect(() => {
    if (selectedDeviceIds.length === 0 && complexDevices.length > 0) {
      setSelectedDeviceIds(complexDevices.map(d => d.id));
    }
  }, [complexDevices]);
  
  const [isColumnPickerVisible, setIsColumnPickerVisible] = useState(false);

  const tabularData = useMemo(() => resolveTabularPatch(project), [project]);

  const filteredData = useMemo(() => {
    return tabularData.filter((row) => {
      const searchStr = `${row.sourceDeviceName} ${row.sourceEffectiveName} ${row.hops.map(h => h.deviceName).join(' ')}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
  }, [tabularData, searchQuery]);

  const toggleDeviceColumn = (id: string) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const tableWidth = useMemo(() => COLUMN_WIDTH + (selectedDeviceIds.length * COLUMN_WIDTH), [selectedDeviceIds]);

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', width: tableWidth, height: 60, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
      <View style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#e5e7eb', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: '#374151' }}>Simple Devices (Rows)</Text>
      </View>
      
      {selectedDeviceIds.map(deviceId => {
        const device = project.devices.find(d => d.id === deviceId);
        return (
          <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#eff6ff', justifyContent: 'center' }}>
            <Text style={{ fontWeight: 'bold', color: '#1d4ed8', textAlign: 'center' }} numberOfLines={1}>
              {device?.name || 'Unknown Device'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'between', marginTop: 4, paddingHorizontal: 8 }}>
              <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold' }}>IN</Text>
              <Text style={{ fontSize: 10, color: '#9ca3af', fontWeight: 'bold' }}>OUT</Text>
            </View>
          </View>
        );
      })}
    </View>
  );

  const renderRow = (item: TabularRow, index: number) => {
    return (
      <View key={`${item.sourceDeviceId}:${item.sourceChannelId}:${item.isSink ? 'sink' : 'source'}`} style={{ flexDirection: 'row', width: tableWidth, height: 70, borderBottomWidth: 1, borderColor: '#f3f4f6', backgroundColor: 'white' }}>
        {/* Simple Device Cell */}
        <View style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#f9fafb', justifyContent: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {item.isSink ? (
              <ArrowDownLeft size={14} color="#ef4444" style={{ marginRight: 4 }} />
            ) : (
              <ArrowUpRight size={14} color="#22c55e" style={{ marginRight: 4 }} />
            )}
            <Text style={{ fontWeight: 'bold', color: 'black' }}>{item.sourceEffectiveName}</Text>
          </View>
          <Text style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{item.sourceDeviceName} ({item.sourceChannelNumber})</Text>
        </View>

        {/* Selected Device Columns */}
        {selectedDeviceIds.map(deviceId => {
          const hop = item.fullPath[deviceId];
          return (
            <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#f9fafb', flexDirection: 'row', alignItems: 'center', justifyContent: 'between' }}>
              {hop ? (
                <>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: 'black', fontWeight: '500' }} numberOfLines={1}>
                      {hop.inputChannelName || (hop.inputChannelNumber ? `Ch ${hop.inputChannelNumber}` : '-')}
                    </Text>
                    {hop.connectorType && <Text style={{ fontSize: 10, color: '#9ca3af' }}>{hop.connectorType}</Text>}
                  </View>
                  
                  <View style={{ paddingHorizontal: 8 }}>
                    <Text style={{ color: '#e5e7eb' }}>→</Text>
                  </View>

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {hop.outputChannelId ? (
                      <>
                        <Text style={{ color: '#2563eb', fontWeight: '500' }} numberOfLines={1}>
                          {hop.outputChannelName || `Ch ${hop.outputChannelNumber}`}
                        </Text>
                        {hop.cableLabel && <Text style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }} numberOfLines={1}>{hop.cableLabel}</Text>}
                      </>
                    ) : (
                      <Text style={{ color: '#e5e7eb' }}>-</Text>
                    )}
                  </View>
                </>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#f3f4f6', fontSize: 12 }}>No Route</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar barStyle="default" />
      
      {/* Header Section */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 8, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'black' }}>Patch Sheet ({filteredData.length})</Text>
          <TouchableOpacity 
            onPress={() => setIsColumnPickerVisible(!isColumnPickerVisible)}
            style={{ padding: 8, borderRadius: 999, backgroundColor: isColumnPickerVisible ? '#dbeafe' : '#f3f4f6' }}
          >
            <Settings2 size={20} color={isColumnPickerVisible ? '#2563eb' : '#666'} />
          </TouchableOpacity>
        </View>

        {isColumnPickerVisible ? (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#6b7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Active Columns (Devices)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row' }}>
              {complexDevices.map(d => (
                <TouchableOpacity
                  key={d.id}
                  onPress={() => toggleDeviceColumn(d.id)}
                  style={{ 
                    marginRight: 8, 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 8, 
                    borderWidth: 1,
                    backgroundColor: selectedDeviceIds.includes(d.id) ? '#2563eb' : 'white',
                    borderColor: selectedDeviceIds.includes(d.id) ? '#2563eb' : '#e5e7eb'
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '500', color: selectedDeviceIds.includes(d.id) ? 'white' : '#374151' }}>
                    {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e5e7eb' }}>
              <Search size={18} color="#666" />
              <TextInput
                style={{ flex: 1, marginLeft: 8, color: 'black' }}
                placeholder="Search source mics, DIs, etc..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor="#666"
              />
            </View>
          </View>
        )}
      </View>

      {/* Table Section */}
      <ScrollView horizontal bounces={false} style={{ flex: 1 }} contentContainerStyle={{ minWidth: tableWidth }}>
        <View style={{ flex: 1 }}>
          <ScrollView 
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            showsVerticalScrollIndicator={true}
          >
            {renderHeader()}
            
            {filteredData.length > 0 ? (
              filteredData.map((item, index) => renderRow(item, index))
            ) : (
              <View style={{ width: tableWidth, padding: 80, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#9ca3af' }}>No patch data found</Text>
                <Text style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Check source device settings</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

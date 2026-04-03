import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { useProject } from '../../contexts/ProjectContext';
import { resolveTabularPatch, TabularRow, SignalHop, isSimpleDevice } from '../../utils/signalChain';
import { Device, Connection } from '../../models';
import { Search, Plus, X, Settings2, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, FileDown } from 'lucide-react-native';
import { ExportService } from '../../services/ExportService';

const COLUMN_WIDTH = 120;
const SMALL_COLUMN_WIDTH = 36;

const ALIASES: Record<string, string> = {
  'DI': 'DI Box',
  'SB': 'Stagebox',
  'Amp': 'Amplifier',
  'SP': 'Speaker',
  'Inst': 'Instrument',
  'WR': 'Wireless Receiver',
  'WT': 'Wireless Transmitter',
  'M': 'Microphone',
  'Mic': 'Microphone',
  'Keys': 'Instrument',
  'Other': 'Other',
};

const parseQuickEntry = (text: string) => {
  // Regex: (Type:)?(Name)(/Channel)?(\(Model\))?
  // Examples:
  // Mic:Kick(Beta91a) -> Type: Mic, Name: Kick, Model: Beta91a
  // Keys/R(Nord Stage) -> Name: Keys, Channel: R, Model: Nord Stage
  
  const regex = /^(([^:/(]+):)?([^:/(]+)(\/([^:(]+))?(\(([^)]+)\))?$/;
  const match = text.match(regex);
  
  if (!match) return null;
  
  let type = match[2]?.trim();
  let name = match[3]?.trim();
  let channelName = match[5]?.trim();
  let model = match[7]?.trim();
  
  if (type && ALIASES[type]) {
    type = ALIASES[type];
  } else if (!type) {
    type = 'Other';
  }
  
  return { type, name, channelName, model };
};

const SourceDeviceCell = ({ item, isMono, category, updateDevice, handleUpdateStereo, addDevice, addConnection, project }: any) => {
  const initialValue = isMono ? item.sourceDeviceName : `${item.sourceDeviceName} / ${item.sourceEffectiveName}`;
  const [localValue, setLocalValue] = useState(initialValue);

  // Sync with prop changes
  React.useEffect(() => {
    setLocalValue(initialValue);
  }, [initialValue]);

  const handleBlur = () => {
    if (localValue === initialValue) return;
    
    const quickEntry = parseQuickEntry(localValue);
    if (quickEntry && (localValue.includes(':') || localValue.includes('/') || localValue.includes('('))) {
      // It's a quick entry!
      // 1. Find if device already exists by name
      let device = project.devices.find((d: Device) => d.name.toLowerCase() === quickEntry.name.toLowerCase());
      
      const channelId = `ch-${Math.random().toString(36).substring(2, 9)}`;
      
      if (!device) {
        // Create new device
        const newId = addDevice({
          name: quickEntry.name,
          type: quickEntry.type,
          model: quickEntry.model,
          inputChannels: [],
          outputChannels: [{
            id: channelId,
            number: 1,
            name: quickEntry.channelName || '',
            channelCount: 1,
            connectorType: 'XLR',
          }],
          isSource: true,
          position: { x: 100, y: 100 }
        });
        
        if (item.hops[0]) {
           const firstHop = item.hops[0];
           addConnection({
               sourceDeviceId: newId,
               sourceChannelId: channelId,
               destinationDeviceId: firstHop.deviceId,
               destinationChannelId: firstHop.inputChannelId
           });
        }
      } else {
        // Device exists. Add channel if needed and connect.
        let outChan = device.outputChannels.find((c: any) => c.name === quickEntry.channelName);
        if (!outChan && quickEntry.channelName) {
            outChan = {
                id: channelId,
                number: device.outputChannels.length + 1,
                name: quickEntry.channelName,
                channelCount: 1,
                connectorType: 'XLR'
            };
            updateDevice(device.id, {
                outputChannels: [...device.outputChannels, outChan]
            });
        } else if (!outChan) {
            outChan = device.outputChannels[0];
        }

        if (outChan && item.hops[0]) {
           const firstHop = item.hops[0];
           addConnection({
               sourceDeviceId: device.id,
               sourceChannelId: outChan.id,
               destinationDeviceId: firstHop.deviceId,
               destinationChannelId: firstHop.inputChannelId
           });
        }
      }
      return;
    }

    if (isMono) {
      updateDevice(item.sourceDeviceId, { name: localValue });
    } else {
      handleUpdateStereo(item, localValue);
    }
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 4, height: 28, backgroundColor: category?.color || '#e5e7eb', marginRight: 4, borderRadius: 2 }} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
          <TextInput
            style={{ fontWeight: 'bold', color: 'black', fontSize: 11, padding: 0, marginRight: 2, flex: 1 }}
            value={localValue}
            onChangeText={setLocalValue}
            onBlur={handleBlur}
          />
          <Text style={{ fontSize: 9, color: '#6b7280' }}>
            ({item.sourceDeviceModel || item.sourceDeviceType})
          </Text>
        </View>
      </View>
    </View>
  );
};

export default function PatchScreen() {
  const { project, updateDevice, addDevice, addConnection } = useProject();
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

  const tableWidth = useMemo(() => 
    SMALL_COLUMN_WIDTH + // 48V (IDX removed)
    COLUMN_WIDTH * 2 + // Source and Destination
    (selectedDeviceIds.length * COLUMN_WIDTH), 
    [selectedDeviceIds]
  );

  const filteredData = useMemo(() => {
    const filtered = tabularData.filter((row) => {
      const searchStr = `${row.sourceDeviceName} ${row.sourceEffectiveName} ${row.terminalDeviceName || ''} ${row.hops.map(h => h.deviceName).join(' ')}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });

    // If searching, just show the flat list
    if (searchQuery) return filtered;

    // Grouping by Category or just showing the sorted list
    // User requested interleaving, so we might want fewer headers
    const grouped: (TabularRow | { isHeader: true, categoryName: string, color: string })[] = [];
    
    // We can group by the primary device (Stagebox) or category
    // For now, let's keep it simple and just show the interleaved list
    // If we want headers, we should group by something meaningful
    
    grouped.push({ isHeader: true, categoryName: 'Stage Patch', color: '#10b981' });
    grouped.push(...filtered);
    
    return grouped;
  }, [tabularData, searchQuery]);

  const toggleDeviceColumn = (id: string) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const handleUpdateName = (deviceId: string, channelId: string, newName: string) => {
    const device = project.devices.find(d => d.id === deviceId);
    if (!device) return;

    const isInput = device.inputChannels.some(c => c.id === channelId);
    if (isInput) {
      updateDevice(deviceId, {
        inputChannels: device.inputChannels.map(c => c.id === channelId ? { ...c, name: newName } : c)
      });
    } else {
      updateDevice(deviceId, {
        outputChannels: device.outputChannels.map(c => c.id === channelId ? { ...c, name: newName } : c)
      });
    }
  };

  const handleUpdateStereo = (row: TabularRow, value: string) => {
    const parts = value.split('/').map(p => p.trim());
    const newDeviceName = parts[0] || '';
    const newChannelName = parts[1] || '';

    if (newDeviceName !== row.sourceDeviceName) {
      updateDevice(row.sourceDeviceId, { name: newDeviceName });
    }
    if (newChannelName !== row.sourceEffectiveName) {
      handleUpdateName(row.sourceDeviceId, row.sourceChannelId, newChannelName);
    }
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', width: tableWidth, height: 60, backgroundColor: '#374151', borderBottomWidth: 1, borderColor: '#1f2937' }}>
      <View style={{ width: SMALL_COLUMN_WIDTH, padding: 8, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 10 }}>48V</Text>
      </View>
      <View style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>Source / Terminal</Text>
      </View>
      
      {selectedDeviceIds.map(deviceId => {
        const device = project.devices.find(d => d.id === deviceId);
        return (
          <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 8, borderRightWidth: 1, borderColor: '#4b5563', backgroundColor: '#1e3a8a', justifyContent: 'center' }}>
            <Text style={{ fontWeight: 'bold', color: '#bfdbfe', textAlign: 'center', fontSize: 10 }} numberOfLines={1}>
              {device?.name || 'Unknown Device'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 8, color: '#93c5fd', fontWeight: 'bold', width: 18, textAlign: 'center' }}>IN #</Text>
              <Text style={{ fontSize: 8, color: '#93c5fd', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>CHANNEL</Text>
              <Text style={{ fontSize: 8, color: '#93c5fd', fontWeight: 'bold', width: 18, textAlign: 'center' }}>OUT #</Text>
            </View>
          </View>
        );
      })}

      <View style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1, textAlign: 'right' }}>Destination / Terminal</Text>
      </View>
    </View>
  );

  const renderRow = (item: TabularRow, index: number) => {
    const isEven = index % 2 === 0;
    const category = project.categories.find(c => c.id === item.sourceCategoryId);
    const sourceDevice = project.devices.find(d => d.id === item.sourceDeviceId);
    const isMono = (sourceDevice?.outputChannels.length || 0) <= 1;
    const isComplexSource = !isSimpleDevice(sourceDevice!);
    
    return (
      <View key={`${item.sourceDeviceId}:${item.sourceChannelId}:${item.isSink ? 'sink' : 'source'}:${item.index}`} style={{ flexDirection: 'row', width: tableWidth, height: 60, borderBottomWidth: 1, borderColor: '#e5e7eb', backgroundColor: isEven ? 'white' : '#f9fafb' }}>
        {/* 48V */}
        <View style={{ width: SMALL_COLUMN_WIDTH, padding: 4, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
          {item.sourcePhantomPower && (
            <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#f87171' }}>
              <Text style={{ fontSize: 9, color: '#b91c1c', fontWeight: 'bold' }}>48V</Text>
            </View>
          )}
        </View>

        {/* Simple Device Cell (Left Side: Source) */}
        <View style={{ width: COLUMN_WIDTH, padding: 6, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center' }}>
          {item.sourceDeviceId && !item.isSink && (!isComplexSource || (isComplexSource && item.hops.length > 0 && item.hops[0].deviceId === item.sourceDeviceId)) ? (
            <SourceDeviceCell 
                item={item} 
                isMono={isMono} 
                category={category} 
                updateDevice={updateDevice} 
                handleUpdateStereo={handleUpdateStereo} 
                addDevice={addDevice}
                addConnection={addConnection}
                project={project}
            />
          ) : (item.isSink || isComplexSource) && item.sourceDeviceId ? (
             <View style={{ paddingLeft: 4 }}>
                <Text style={{ fontWeight: 'bold', color: '#1d4ed8', fontSize: 10 }}>{item.sourceDeviceName}</Text>
                <Text style={{ fontSize: 9, color: '#6b7280' }}>Ch {item.sourceChannelNumber} ({item.sourceEffectiveName})</Text>
             </View>
          ) : (
            <View style={{ paddingLeft: 4 }}>
              <Text style={{ fontSize: 10, color: '#9ca3af', fontStyle: 'italic' }}>System Output</Text>
            </View>
          )}
        </View>

        {/* Selected Device Columns */}
        {selectedDeviceIds.map(deviceId => {
          const hop = item.fullPath[deviceId];
          // Only show both numbers if they're different, otherwise just show one
          const showIn = !!hop?.inputChannelNumber;
          const showOut = !!hop?.outputChannelNumber && hop.outputChannelNumber !== hop.inputChannelNumber;
          
          return (
            <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 2, borderRightWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center' }}>
              {hop ? (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  {/* Input # */}
                  <View style={{ width: 14, alignItems: 'center' }}>
                    {showIn && (
                      <Text style={{ color: '#6b7280', fontSize: 9, fontWeight: 'bold' }}>
                        {hop.inputChannelNumber}
                      </Text>
                    )}
                  </View>
                  
                  {/* Channel Name */}
                  <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 1 }}>
                    <TextInput
                      style={{ color: 'black', fontWeight: '500', fontSize: 10, textAlign: 'center', padding: 0, width: '100%' }}
                      value={hop.inputChannelName || hop.outputChannelName || ''}
                      placeholder={hop.inputEffectiveName || hop.outputEffectiveName || `Ch ${hop.inputChannelNumber || hop.outputChannelNumber}`}
                      placeholderTextColor="#9ca3af"
                      onChangeText={(val) => {
                        if (hop.inputChannelId) handleUpdateName(hop.deviceId, hop.inputChannelId, val);
                        if (hop.outputChannelId) handleUpdateName(hop.deviceId, hop.outputChannelId, val);
                      }}
                    />
                  </View>

                  {/* Output # */}
                  <View style={{ width: 14, alignItems: 'center' }}>
                    {showOut && (
                      <Text style={{ color: '#2563eb', fontSize: 9, fontWeight: 'bold' }}>
                        {hop.outputChannelNumber}
                      </Text>
                    )}
                  </View>
                </View>
              ) : (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#f3f4f6', fontSize: 12 }}>-</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Terminal Device Cell (Right Side: Sink) */}
        <View style={{ width: COLUMN_WIDTH, padding: 8, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center', alignItems: 'flex-end' }}>
          {item.terminalDeviceId ? (
            <View style={{ alignItems: 'flex-end' }}>
              <TextInput
                style={{ fontWeight: 'bold', color: 'black', fontSize: 12, textAlign: 'right', padding: 0 }}
                value={item.terminalDeviceName}
                onChangeText={(val) => updateDevice(item.terminalDeviceId!, { name: val })}
              />
              <TextInput
                style={{ fontSize: 10, color: '#6b7280', textAlign: 'right', padding: 0 }}
                value={item.terminalChannelName?.replace(/^Ch \d+/, '').trim() || item.terminalChannelName}
                onChangeText={(val) => {
                    const device = project.devices.find(d => d.id === item.terminalDeviceId);
                    if (device) {
                        const channel = device.inputChannels.find(c => c.name === item.terminalChannelName || `Ch ${c.number}` === item.terminalChannelName);
                        if (channel) {
                            handleUpdateName(device.id, channel.id, val);
                        }
                    }
                }}
                placeholder="Name"
              />
              <Text style={{ fontSize: 9, color: '#9ca3af', marginTop: 1, textAlign: 'right' }}>
                ({item.terminalDeviceType})
              </Text>
            </View>
          ) : (
            <Text style={{ color: '#e5e7eb', fontSize: 12 }}>-</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar barStyle="default" />
      
      {/* Header Section */}
      <View style={{ paddingHorizontal: 24, paddingVertical: 8, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'black' }}>Patch Sheet ({filteredData.length})</Text>
          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity 
              onPress={() => ExportService.exportPatchPDF(project, selectedDeviceIds)}
              style={{ padding: 8, borderRadius: 999, backgroundColor: '#f3f4f6', marginRight: 8 }}
            >
              <FileDown size={20} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setIsColumnPickerVisible(!isColumnPickerVisible)}
              style={{ padding: 8, borderRadius: 999, backgroundColor: isColumnPickerVisible ? '#dbeafe' : '#f3f4f6' }}
            >
              <Settings2 size={20} color={isColumnPickerVisible ? '#2563eb' : '#666'} />
            </TouchableOpacity>
          </View>
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
              filteredData.map((item, index) => {
                if ('isHeader' in item) {
                  return (
                    <View key={`header-${item.categoryName}`} style={{ width: tableWidth, height: 32, backgroundColor: '#f3f4f6', borderBottomWidth: 1, borderColor: '#e5e7eb', paddingHorizontal: 12, justifyContent: 'center' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color, marginRight: 8 }} />
                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#4b5563', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.categoryName}</Text>
                      </View>
                    </View>
                  );
                }
                return renderRow(item as TabularRow, index);
              })
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

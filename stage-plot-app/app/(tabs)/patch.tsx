import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { useProject } from '../../contexts/ProjectContext';
import { resolveTabularPatch, TabularRow, SignalHop, isSourceOrTerminal, shouldShowChannelNames } from '../../utils/signalChain';
import { Device, Connection } from '../../models';
import { Search, Plus, X, Settings2, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, FileDown, Zap } from 'lucide-react-native';
import { ExportService } from '../../services/ExportService';
import { useRouter } from 'expo-router';
import { ALIASES, parseQuickEntry } from '../../utils/quickEntry';
import { COMMON_NAMES, DEVICE_TYPES, MIC_MODELS } from '../../constants/DeviceLibrary';

const COLUMN_WIDTH = 120;

const SuggestionList = ({ visible, filter, onSelect }: { visible: boolean, filter: string, onSelect: (val: string) => void }) => {
  const suggestions = useMemo(() => {
    if (!filter || filter.length < 1) return [];
    
    // Normalize filter
    const normalized = filter.toLowerCase();
    
    // Check if we are in a specific segment
    const hasTypePrefix = filter.includes(':') || (filter.includes(' ') && ALIASES[filter.split(' ')[0].replace(':', '')]);
    const hasChannelPrefix = filter.includes('/');
    const hasModelPrefix = filter.includes('(');

    let candidates: string[] = [];

    if (hasModelPrefix) {
      candidates = MIC_MODELS;
    } else if (hasChannelPrefix) {
      candidates = ['L', 'R', 'In', 'Out', '1', '2', '3', '4'];
    } else if (hasTypePrefix) {
      candidates = COMMON_NAMES;
    } else {
      // Top level: show types and common names
      candidates = [...Object.keys(ALIASES), ...COMMON_NAMES];
    }

    const lastPart = normalized.split(/[:/( ]/).pop() || '';
    const filtered = candidates
      .filter(c => c.toLowerCase().startsWith(lastPart))
      .slice(0, 5);
    
    return filtered;
  }, [filter]);

  if (!visible || suggestions.length === 0) return null;

  return (
    <View style={{ position: 'absolute', bottom: 25, left: 0, right: 0, backgroundColor: 'white', borderRadius: 8, padding: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5, zIndex: 100, borderWidth: 1, borderColor: '#e5e7eb' }}>
      {suggestions.map((s, i) => (
        <TouchableOpacity 
          key={i} 
          onPress={() => onSelect(s)}
          style={{ paddingVertical: 8, paddingHorizontal: 12, borderBottomWidth: i === suggestions.length - 1 ? 0 : 1, borderBottomColor: '#f3f4f6' }}
        >
          <Text style={{ fontSize: 13, color: '#374151', fontWeight: '500' }}>{s}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const SourceDeviceCell = ({ item, isMono, group, category, updateDevice, handleUpdateStereo, addDevice, addConnection, project, findDeviceByName, inputRef, onSubmitEditing, onSelectDevice, onFocus, onBlur }: any) => {
  const sourceDevice = project.devices.find((d: Device) => d.id === item.sourceDeviceId);
  const sourceChannel = sourceDevice?.outputChannels.find((c: any) => c.id === item.sourceChannelId);
  const channelName = sourceChannel?.name || "";
  const channelNameDisplay = channelName || (sourceChannel?.number ? `#${sourceChannel.number}` : "");
  const initialValue = isMono ? item.sourceDeviceName : (item.sourceDeviceName ? `${item.sourceDeviceName} / ${channelNameDisplay}` : "");
  const [localValue, setLocalValue] = useState(initialValue);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const isCommitting = React.useRef(false);
  const isSelectingSuggestion = React.useRef(false);

  // Sync with prop changes
  React.useEffect(() => {
    setLocalValue(initialValue);
    isCommitting.current = false;
  }, [initialValue]);

  const handleTextChange = (text: string) => {
    setLocalValue(text);
    setShowSuggestions(true);
  };

  const onSelectSuggestion = (s: string) => {
    isSelectingSuggestion.current = true;
    let newValue = localValue;
    
    // Determine where to insert based on context
    const lastPartIndex = Math.max(localValue.lastIndexOf(':'), localValue.lastIndexOf('/'), localValue.lastIndexOf('('), localValue.lastIndexOf(' '));
    if (lastPartIndex >= 0) {
        const prefix = localValue.substring(0, lastPartIndex + 1);
        const suffix = localValue.includes('(') && !localValue.endsWith(')') ? ')' : '';
        newValue = prefix + s + suffix;
    } else {
        newValue = s;
    }
    
    setLocalValue(newValue);
    // Focus back to input
    if (inputRef) {
        inputRef.focus();
    }
    
    // Reset the flag after a short delay to allow handleCommit to ignore the blur
    setTimeout(() => {
        isSelectingSuggestion.current = false;
    }, 100);
  };

  const handleCommit = (value: string) => {
    if (isCommitting.current || isSelectingSuggestion.current) return;
    if (value === initialValue && item.sourceDeviceId) {
        setShowSuggestions(false);
        onBlur();
        return;
    }
    
    isCommitting.current = true;
    setShowSuggestions(false);
    onBlur();
    let commitValue = value;
    // For suggestions, we want to use the full name if user hit return on a suggestion
    if (!item.sourceDeviceId && value && !value.includes(':') && !value.includes('/') && !value.includes('(')) {
        commitValue = value.trim();
    }

    try {
      const quickEntry = parseQuickEntry(commitValue);
      if (quickEntry && (commitValue.includes(':') || commitValue.includes('/') || commitValue.includes('(') || commitValue.includes(' ') || !item.sourceDeviceId)) {
        let device = findDeviceByName(quickEntry.name);
        
        const channelId = `ch-${Math.random().toString(36).substring(2, 9)}`;
        
        if (!device) {
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
            position: { x: 100, y: 100 },
            metadata: {
              showChannelNames: false
            }
          });
          
          const firstHop = item.hops[0];
          if (firstHop) {
             addConnection({
                 sourceDeviceId: newId,
                 sourceChannelId: channelId,
                 destinationDeviceId: firstHop.deviceId,
                 destinationChannelId: firstHop.inputChannelId
             });
          }
        } else {
          let outChan = device.outputChannels.find((c: any) => c.name.toLowerCase() === quickEntry.channelName?.toLowerCase());
          
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
              outChan = device.outputChannels[0] || {
                  id: channelId,
                  number: 1,
                  name: '',
                  channelCount: 1,
                  connectorType: 'XLR'
              };
              if (device.outputChannels.length === 0) {
                  updateDevice(device.id, { outputChannels: [outChan] });
              }
          }

          const firstHop = item.hops[0];
          if (outChan && firstHop) {
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

      if (item.sourceDeviceId) {
          if (isMono) {
            updateDevice(item.sourceDeviceId, { name: value });
          } else {
            handleUpdateStereo(item, value);
          }
      }
    } finally {
      isCommitting.current = false;
    }
  };

  return (
    <View style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
        <SuggestionList visible={showSuggestions} filter={localValue} onSelect={onSelectSuggestion} />
        <TouchableOpacity 
          activeOpacity={0.7} 
          onPress={() => item.sourceDeviceId && onSelectDevice(item.sourceDeviceId)}
          style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
        >
          <View style={{ width: 4, height: 28, backgroundColor: group?.color || '#e5e7eb', marginRight: 4, borderRadius: 2 }} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ flex: 1, position: 'relative', height: 18, justifyContent: 'center' }}>
                <TextInput
                  ref={inputRef}
                  style={{ fontWeight: 'bold', color: 'black', fontSize: 14, padding: 0, marginRight: 2, height: 18, backgroundColor: 'transparent' }}
                  value={localValue}
                  placeholder={!item.sourceDeviceId ? "Assign Source..." : ""}
                  placeholderTextColor="#9ca3af"
                  onChangeText={handleTextChange}
                  onFocus={onFocus}
                  onBlur={() => handleCommit(localValue)}
                  onSubmitEditing={() => {
                      handleCommit(localValue);
                      onSubmitEditing();
                  }}
                  returnKeyType="next"
                  blurOnSubmit={false}
                />
              </View>
              {item.sourcePhantomPower && (
                <Zap size={10} color="#ef4444" fill="#ef4444" style={{ marginRight: 2 }} />
              )}
              {category && (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: category.color, marginRight: 2 }} />
              )}
            </View>
            {item.sourceDeviceId && (
              <Text style={{ fontSize: 13, color: '#6b7280' }} numberOfLines={1}>
                ({item.sourceDeviceModel || item.sourceDeviceType})
              </Text>
            )}
          </View>
        </TouchableOpacity>
    </View>
  );
};

export default function PatchScreen() {
  const { project, updateDevice, addDevice, addConnection, updateConfig, setEditingDeviceId, findDeviceByName } = useProject();
  const [searchQuery, setSearchQuery] = useState('');
  const inputRefs = React.useRef<Record<string, any>>({});
  const [editingRowIndex, setEditingRowIndex] = useState<number | null>(null);
  const router = useRouter();
  
  const complexDevices = useMemo(() => 
    project.devices.filter(d => shouldShowChannelNames(d)),
    [project]
  );

  const [userSelectedDeviceIds, setUserSelectedDeviceIds] = useState<string[] | null>(null);
  
  const selectedDeviceIds = useMemo(() => {
    const ids = userSelectedDeviceIds === null 
      ? complexDevices.map(d => d.id) 
      : userSelectedDeviceIds;
    return ids.filter(id => complexDevices.some(d => d.id === id));
  }, [userSelectedDeviceIds, complexDevices]);
  
  const [isColumnPickerVisible, setIsColumnPickerVisible] = useState(false);

  const tabularData = useMemo(() => resolveTabularPatch(project), [project]);

  const tableWidth = useMemo(() => 
    COLUMN_WIDTH * 2 + // Source and Destination
    (selectedDeviceIds.length * COLUMN_WIDTH), 
    [selectedDeviceIds]
  );

  const filteredData = useMemo(() => {
    return tabularData.filter((row) => {
      const searchStr = `${row.sourceDeviceName} ${row.sourceEffectiveName} ${row.terminalDeviceName || ''} ${row.hops.map(h => h.deviceName).join(' ')}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });
  }, [tabularData, searchQuery]);

  const toggleDeviceColumn = (id: string) => {
    setUserSelectedDeviceIds(prev => {
      const current = prev === null ? complexDevices.map(d => d.id) : prev;
      return current.includes(id) ? current.filter(d => d !== id) : [...current, id];
    });
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

  const onSelectDevice = (deviceId: string) => {
    setEditingDeviceId(deviceId);
    router.push('/(tabs)');
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', width: tableWidth, height: 44, backgroundColor: '#374151', borderBottomWidth: 1, borderColor: '#1f2937' }}>
      <View style={{ width: COLUMN_WIDTH, paddingHorizontal: 8, paddingVertical: 4, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>Source</Text>
      </View>
      
      {selectedDeviceIds.map(deviceId => {
        const device = project.devices.find(d => d.id === deviceId);
        return (
          <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 2, borderRightWidth: 1, borderColor: '#4b5563', backgroundColor: device?.type?.toLowerCase() === 'snake' ? '#1e40af' : '#1e3a8a', justifyContent: 'center' }}>
            <Text style={{ fontWeight: 'bold', color: '#bfdbfe', textAlign: 'center', fontSize: 11 }} numberOfLines={1}>
              {device?.name || 'Unknown Device'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 1, paddingHorizontal: 2 }}>
              <Text style={{ fontSize: 9, color: '#93c5fd', fontWeight: 'bold', width: device?.type?.toLowerCase() === 'snake' ? '100%' : 18, textAlign: 'center' }}>
                {device?.type?.toLowerCase() === 'snake' ? 'CH #' : 'IN #'}
              </Text>
              {device?.type?.toLowerCase() !== 'snake' && (
                <>
                  <Text style={{ fontSize: 9, color: '#93c5fd', fontWeight: 'bold', flex: 1, textAlign: 'center' }}>CHANNEL</Text>
                  <Text style={{ fontSize: 9, color: '#93c5fd', fontWeight: 'bold', width: 18, textAlign: 'center' }}>OUT #</Text>
                </>
              )}
            </View>
          </View>
        );
      })}

      <View style={{ width: COLUMN_WIDTH, paddingHorizontal: 8, paddingVertical: 4, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1, textAlign: 'right' }}>Terminal</Text>
      </View>
    </View>
  );

  const renderRow = (item: TabularRow, index: number) => {
    const isEven = index % 2 === 0;
    const group = project.groups.find(g => g.id === item.sourceGroupId);
    const category = project.categories.find(c => c.id === item.sourceCategoryId);
    const sourceDevice = project.devices.find(d => d.id === item.sourceDeviceId);
    const isMono = (sourceDevice?.outputChannels.length || 0) <= 1;
    
    const isEditing = editingRowIndex === index;
    
    return (
      <View 
        style={{ 
          flexDirection: 'row', 
          width: tableWidth, 
          height: 40, 
          borderBottomWidth: 1, 
          borderColor: '#e5e7eb', 
          backgroundColor: isEven ? 'white' : '#f9fafb',
          zIndex: isEditing ? 100 : 1,
          elevation: isEditing ? 5 : 0,
          overflow: 'visible'
        }}
      >
        {/* Simple Device Cell (Left Side: Source) */}
        <View style={{ width: COLUMN_WIDTH, padding: 2, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center', overflow: 'visible' }}>
          {item.sourceDeviceId ? (
            <SourceDeviceCell 
                item={item} 
                isMono={isMono} 
                group={group} 
                category={category}
                updateDevice={updateDevice} 
                handleUpdateStereo={handleUpdateStereo} 
                addDevice={addDevice}
                addConnection={addConnection}
                project={project}
                findDeviceByName={findDeviceByName}
                inputRef={(ref: any) => { inputRefs.current[item.index] = ref; }}
                onSelectDevice={onSelectDevice}
                onFocus={() => setEditingRowIndex(index)}
                onBlur={() => setEditingRowIndex(null)}
                onSubmitEditing={() => {
                    const nextIndex = item.index + 1;
                    if (inputRefs.current[nextIndex]) {
                        inputRefs.current[nextIndex].focus();
                    }
                }}
            />
          ) : null}
        </View>

        {/* Selected Device Columns */}
        {selectedDeviceIds.map(deviceId => {
          const device = project.devices.find(d => d.id === deviceId);
          const isSnake = device?.type?.toLowerCase() === 'snake';
          const hop = item.fullPath[deviceId];
          const showIn = !!hop?.inputChannelNumber;
          const showOut = !isSnake && !!hop?.outputChannelNumber && hop.outputChannelNumber !== hop.inputChannelNumber;
          
          return (
            <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 1, borderRightWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center' }}>
              {hop ? (
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ width: 14, alignItems: 'center' }}>
                    {showIn && (
                      <Text style={{ color: isSnake ? '#3b82f6' : '#6b7280', fontSize: 14, fontWeight: 'bold' }}>
                        {hop.inputChannelNumber}
                      </Text>
                    )}
                  </View>
                  
                  {!isSnake && (
                    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 1 }}>
                      <TextInput
                        style={{ color: 'black', fontWeight: '500', fontSize: 12, textAlign: 'center', padding: 0, width: '100%' }}
                        value={hop.inputChannelName || hop.outputChannelName || ''}
                        placeholder={hop.inputEffectiveName || hop.outputEffectiveName || `Ch ${hop.inputChannelNumber || hop.outputChannelNumber}`}
                        placeholderTextColor="#9ca3af"
                        onChangeText={(val) => {
                          if (hop.inputChannelId) handleUpdateName(hop.deviceId, hop.inputChannelId, val);
                          if (hop.outputChannelId) handleUpdateName(hop.deviceId, hop.outputChannelId, val);
                        }}
                      />
                    </View>
                  )}

                  {isSnake && <View style={{ flex: 1 }} />}

                  <View style={{ width: 14, alignItems: 'center' }}>
                    {showOut && (
                      <Text style={{ color: '#2563eb', fontSize: 14, fontWeight: 'bold' }}>
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
        <View style={{ width: COLUMN_WIDTH, paddingVertical: 2, paddingHorizontal: 4, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center', alignItems: 'flex-end' }}>
          {item.terminalDeviceId ? (
            <TouchableOpacity 
              style={{ alignItems: 'flex-end' }}
              onPress={() => onSelectDevice(item.terminalDeviceId!)}
            >
              <TextInput
                style={{ fontWeight: 'bold', color: 'black', fontSize: 14, textAlign: 'right', padding: 0, height: 16 }}
                value={item.terminalDeviceName}
                onChangeText={(val) => updateDevice(item.terminalDeviceId!, { name: val })}
              />
              <TextInput
                style={{ fontSize: 11, color: '#6b7280', textAlign: 'right', padding: 0, height: 13 }}
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
                placeholderTextColor="#9ca3af"
              />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <StatusBar barStyle="default" />
      
      <View style={{ paddingHorizontal: 24, paddingVertical: 8, backgroundColor: 'white', borderBottomWidth: 1, borderColor: '#e5e7eb' }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: 'black' }}>Patch Sheet ({filteredData.length})</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity 
              onPress={() => updateConfig({ sortByGroup: !project.config?.sortByGroup })}
              style={{ padding: 8, borderRadius: 999, backgroundColor: project.config?.sortByGroup ? '#dbeafe' : '#f3f4f6', marginRight: 8 }}
            >
              <ArrowDownLeft size={20} color={project.config?.sortByGroup ? '#2563eb' : '#666'} />
            </TouchableOpacity>
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

        {isColumnPickerVisible && (
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
        )}

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
      </View>

      <ScrollView horizontal bounces={false} showsHorizontalScrollIndicator={true}>
        <View>
          {renderHeader()}
          <ScrollView style={{ flex: 1 }}>
            {filteredData.map((row, index) => {
              const prevRow = index > 0 ? filteredData[index - 1] : null;
              const showHeader = !prevRow || 
                                prevRow.isSink !== row.isSink || 
                                (prevRow.primaryConnectorType !== row.primaryConnectorType && !!row.primaryConnectorType);
              
              return (
                <View key={`${row.sourceDeviceId}:${row.sourceChannelId}:${row.isSink ? 'sink' : 'source'}:${row.index}`}>
                  {showHeader && (
                    <View style={{ 
                      height: 32, 
                      backgroundColor: row.isSink ? '#fef2f2' : '#f0fdf4', 
                      justifyContent: 'center', 
                      paddingHorizontal: 12, 
                      borderBottomWidth: 1, 
                      borderColor: row.isSink ? '#fee2e2' : '#dcfce7', 
                      width: tableWidth 
                    }}>
                      <Text style={{ 
                        fontSize: 11, 
                        fontWeight: '800', 
                        color: row.isSink ? '#991b1b' : '#166534', 
                        textTransform: 'uppercase', 
                        letterSpacing: 1 
                      }}>
                        {row.isSink ? 'Outputs' : 'Inputs'} — {row.primaryConnectorType || (row.isSink ? 'Analog' : 'Source')}
                      </Text>
                    </View>
                  )}
                  {renderRow(row, index)}
                </View>
              );
            })}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

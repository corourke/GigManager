import React, { useState, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { useProject } from '../../contexts/ProjectContext';
import { resolveTabularPatch, TabularRow, SignalHop, isSimpleDevice } from '../../utils/signalChain';
import { Device, Connection } from '../../models';
import { Search, Plus, X, Settings2, ArrowRightLeft, ArrowUpRight, ArrowDownLeft, FileDown } from 'lucide-react-native';
import { ExportService } from '../../services/ExportService';

const COLUMN_WIDTH = 240;
const SMALL_COLUMN_WIDTH = 48;

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

  const tableWidth = useMemo(() => 
    SMALL_COLUMN_WIDTH * 2 + // Idx and 48V
    COLUMN_WIDTH * 2 + // Source and Destination
    (selectedDeviceIds.length * COLUMN_WIDTH), 
    [selectedDeviceIds]
  );

  const filteredData = useMemo(() => {
    const filtered = tabularData.filter((row) => {
      const searchStr = `${row.sourceDeviceName} ${row.sourceEffectiveName} ${row.terminalDeviceName || ''} ${row.hops.map(h => h.deviceName).join(' ')}`.toLowerCase();
      return searchStr.includes(searchQuery.toLowerCase());
    });

    // Group by Category
    const grouped: (TabularRow | { isHeader: true, categoryName: string, color: string })[] = [];
    let lastCategoryId: string | undefined = undefined;

    // Sort by category first, then by the first complex device's channel number
    const sorted = [...filtered].sort((a, b) => {
      // Category Sort
      const catA = project.categories.find(c => c.id === a.sourceCategoryId)?.name || 'Uncategorized';
      const catB = project.categories.find(c => c.id === b.sourceCategoryId)?.name || 'Uncategorized';
      if (catA !== catB) return catA.localeCompare(catB);

      // Channel Sort (use first complex hop as primary channel reference)
      const getPrimaryChannel = (row: TabularRow) => {
        if (row.hops.length > 0) {
          return row.hops[0].inputChannelNumber || row.hops[0].outputChannelNumber || 0;
        }
        return row.sourceChannelNumber || 0;
      };

      return getPrimaryChannel(a) - getPrimaryChannel(b);
    });

    for (const row of sorted) {
      if (row.sourceCategoryId !== lastCategoryId) {
        const category = project.categories.find(c => c.id === row.sourceCategoryId);
        grouped.push({ 
          isHeader: true, 
          categoryName: category?.name || 'Uncategorized',
          color: category?.color || '#e5e7eb'
        });
        lastCategoryId = row.sourceCategoryId;
      }
      grouped.push(row);
    }
    
    return grouped;
  }, [tabularData, searchQuery, project.categories]);

  const toggleDeviceColumn = (id: string) => {
    setSelectedDeviceIds(prev => 
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const renderHeader = () => (
    <View style={{ flexDirection: 'row', width: tableWidth, height: 60, backgroundColor: '#374151', borderBottomWidth: 1, borderColor: '#1f2937' }}>
      <View style={{ width: SMALL_COLUMN_WIDTH, padding: 8, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 10 }}>IDX</Text>
      </View>
      <View style={{ width: SMALL_COLUMN_WIDTH, padding: 8, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', fontSize: 10 }}>48V</Text>
      </View>
      <View style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#4b5563', justifyContent: 'center' }}>
        <Text style={{ fontWeight: 'bold', color: 'white', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>Source / Terminal</Text>
      </View>
      
      {selectedDeviceIds.map(deviceId => {
        const device = project.devices.find(d => d.id === deviceId);
        return (
          <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#4b5563', backgroundColor: '#1e3a8a', justifyContent: 'center' }}>
            <Text style={{ fontWeight: 'bold', color: '#bfdbfe', textAlign: 'center', fontSize: 12 }} numberOfLines={1}>
              {device?.name || 'Unknown Device'}
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 9, color: '#93c5fd', fontWeight: 'bold' }}>IN</Text>
              <Text style={{ fontSize: 9, color: '#93c5fd', fontWeight: 'bold' }}>OUT</Text>
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
    
    return (
      <View key={`${item.sourceDeviceId}:${item.sourceChannelId}:${item.isSink ? 'sink' : 'source'}`} style={{ flexDirection: 'row', width: tableWidth, height: 70, borderBottomWidth: 1, borderColor: '#e5e7eb', backgroundColor: isEven ? 'white' : '#f9fafb' }}>
        {/* Index */}
        <View style={{ width: SMALL_COLUMN_WIDTH, padding: 8, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#6b7280', fontWeight: 'bold' }}>{item.index}</Text>
        </View>

        {/* 48V */}
        <View style={{ width: SMALL_COLUMN_WIDTH, padding: 8, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center', alignItems: 'center' }}>
          {item.sourcePhantomPower && (
            <View style={{ backgroundColor: '#fee2e2', paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4, borderWidth: 1, borderColor: '#f87171' }}>
              <Text style={{ fontSize: 9, color: '#b91c1c', fontWeight: 'bold' }}>48V</Text>
            </View>
          )}
        </View>

        {/* Simple Device Cell (Left Side: Source) */}
        <View style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center' }}>
          {item.sourceDeviceId ? (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
              <View style={{ width: 4, height: '100%', backgroundColor: category?.color || '#e5e7eb', marginRight: 8, borderRadius: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: 'bold', color: 'black', fontSize: 13 }}>
                  {item.sourceDeviceName}
                  {item.sourceEffectiveName && 
                   item.sourceEffectiveName !== item.sourceDeviceName && 
                   item.sourceEffectiveName !== 'Ch 1' 
                   ? ` - ${item.sourceEffectiveName}` : ''}
                </Text>
                <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                  ({item.sourceDeviceModel || item.sourceDeviceType})
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ paddingLeft: 12 }}>
              <Text style={{ fontSize: 11, color: '#9ca3af', fontStyle: 'italic' }}>System Output</Text>
            </View>
          )}
        </View>

        {/* Selected Device Columns */}
        {selectedDeviceIds.map(deviceId => {
          const hop = item.fullPath[deviceId];
          return (
            <View key={deviceId} style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#f3f4f6', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              {hop ? (
                <>
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: 'black', fontWeight: '500', fontSize: 13 }} numberOfLines={1}>
                      {hop.inputChannelName || (hop.inputChannelNumber ? `Ch ${hop.inputChannelNumber}` : '-')}
                    </Text>
                    {hop.connectorType && <Text style={{ fontSize: 10, color: '#9ca3af' }}>{hop.connectorType}</Text>}
                  </View>
                  
                  <View style={{ paddingHorizontal: 4 }}>
                    <ArrowRightLeft size={12} color="#e5e7eb" />
                  </View>

                  <View style={{ flex: 1, alignItems: 'center' }}>
                    {hop.outputChannelId ? (
                      <>
                        <Text style={{ color: '#2563eb', fontWeight: '500', fontSize: 13 }} numberOfLines={1}>
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
                  <Text style={{ color: '#f3f4f6', fontSize: 12 }}>-</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Terminal Device Cell */}
        <View style={{ width: COLUMN_WIDTH, padding: 12, borderRightWidth: 1, borderColor: '#f3f4f6', justifyContent: 'center', alignItems: 'flex-end' }}>
          {item.terminalDeviceId ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: 'bold', color: 'black', fontSize: 13, textAlign: 'right' }}>
                {item.terminalDeviceName}
                {item.terminalChannelName && item.terminalChannelName !== item.terminalDeviceName ? ` - ${item.terminalChannelName}` : ''}
              </Text>
              <Text style={{ fontSize: 10, color: '#6b7280', marginTop: 1, textAlign: 'right' }}>
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

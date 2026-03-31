import React, { useState, useEffect, useRef } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform,
  Switch
} from 'react-native';
import { X, Plus, Trash2, ChevronDown, Zap, ChevronRight } from 'lucide-react-native';
import { Device, Port, Group, Category } from '../models';
import { DEVICE_TYPES, CONNECTOR_TYPES, OUTPUT_CONNECTOR_TYPES, MIC_MODELS } from '../constants/DeviceLibrary';

interface DeviceModalProps {
  visible: boolean;
  device?: Device;
  groups: Group[];
  categories: Category[];
  onClose: () => void;
  onSave: (device: Omit<Device, 'id'> | Device) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

export function DeviceModal({ visible, device, groups, categories, onClose, onSave }: DeviceModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState(DEVICE_TYPES[0]);
  const [generalName, setGeneralName] = useState('');
  const [specificType, setSpecificType] = useState('');
  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [inputPorts, setInputPorts] = useState<Port[]>([]);
  const [outputPorts, setOutputPorts] = useState<Port[]>([]);
  const [stagePosition, setStagePosition] = useState<'L' | 'C' | 'R' | undefined>(undefined);
  const [micPhantom, setMicPhantom] = useState(false);

  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const isMic = type === 'Microphone';
  const isTerminalSource = isMic || type === 'DI Box' || type === 'Instrument';

  useEffect(() => {
    if (device) {
      setName(device.name);
      setType(device.type);
      setGeneralName(device.metadata.generalName || '');
      setSpecificType(device.metadata.specificType || '');
      setGroupId(device.groupId);
      setCategoryId(device.categoryId);
      setInputPorts(device.inputPorts);
      setOutputPorts(device.outputPorts);
      setStagePosition(device.metadata.stagePosition);
      if (device.type === 'Microphone' && device.outputPorts.length > 0) {
        setMicPhantom(device.outputPorts[0].phantomPower);
      }
    } else {
      setName('');
      setType(DEVICE_TYPES[0]);
      setGeneralName('');
      setSpecificType('');
      setGroupId(undefined);
      setCategoryId(undefined);
      setInputPorts([]);
      setOutputPorts([]);
      setStagePosition(undefined);
      setMicPhantom(false);
    }
  }, [device, visible]);

  const handleSave = () => {
    let finalName = isTerminalSource 
      ? (generalName || specificType || 'Unnamed Device')
      : (name || 'Unnamed Device');

    let finalOutputPorts = outputPorts;
    if (isMic) {
      // Microphones always have 1 output
      finalOutputPorts = [{
        id: outputPorts[0]?.id || generateId(),
        number: 1,
        name: 'Output',
        channelCount: 1,
        connectorType: 'XLR',
        phantomPower: micPhantom,
        pad: false,
      }];
    }

    const deviceData = {
      ...(device ? { id: device.id } : {}),
      name: finalName,
      type,
      groupId,
      categoryId,
      inputPorts: isMic ? [] : inputPorts,
      outputPorts: finalOutputPorts,
      metadata: {
        generalName: isTerminalSource ? generalName : undefined,
        specificType: isTerminalSource ? specificType : undefined,
        stagePosition,
      }
    };

    onSave(deviceData as any);
    onClose();
  };

  const addPort = (portType: 'input' | 'output') => {
    const ports = portType === 'input' ? inputPorts : outputPorts;
    const newPort: Port = {
      id: generateId(),
      number: ports.length + 1,
      name: `Port ${ports.length + 1}`,
      channelCount: 1,
      connectorType: portType === 'input' ? 'XLR' : 'Analog',
      phantomPower: false,
      pad: false,
    };

    if (portType === 'input') setInputPorts([...inputPorts, newPort]);
    else setOutputPorts([...outputPorts, newPort]);
  };

  const cycleConnector = (portType: 'input' | 'output', index: number) => {
    const lib = portType === 'input' ? CONNECTOR_TYPES : OUTPUT_CONNECTOR_TYPES;
    const ports = portType === 'input' ? [...inputPorts] : [...outputPorts];
    const current = ports[index].connectorType || lib[0];
    const currentIndex = lib.indexOf(current as any);
    const nextIndex = (currentIndex + 1) % lib.length;
    ports[index].connectorType = lib[nextIndex];
    
    if (portType === 'input') setInputPorts(ports);
    else setOutputPorts(ports);
  };

  const updatePort = (portType: 'input' | 'output', index: number, updates: Partial<Port>) => {
    if (portType === 'input') {
      const newPorts = [...inputPorts];
      newPorts[index] = { ...newPorts[index], ...updates };
      setInputPorts(newPorts);
    } else {
      const newPorts = [...outputPorts];
      newPorts[index] = { ...newPorts[index], ...updates };
      setOutputPorts(newPorts);
    }
  };

  const deletePort = (portType: 'input' | 'output', id: string) => {
    if (portType === 'input') setInputPorts(inputPorts.filter(p => p.id !== id));
    else setOutputPorts(outputPorts.filter(p => p.id !== id));
  };

  const renderPortRow = (port: Port, index: number, portType: 'input' | 'output') => {
    const nextId = (portType === 'input' ? inputPorts[index + 1] : outputPorts[index + 1])?.id;
    const isLastInThisSection = portType === 'input' && index === inputPorts.length - 1;
    const firstOutputId = outputPorts[0]?.id;

    return (
      <View key={port.id} className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 mb-1.5">
        <Text className="text-gray-400 font-bold w-5 text-center mr-1">{port.number}</Text>
        
        <TextInput
          ref={el => inputRefs.current[port.id] = el}
          className="flex-1 text-black dark:text-white font-medium mr-2"
          value={port.name}
          placeholder="Name"
          placeholderTextColor="#9ca3af"
          onChangeText={(val) => updatePort(portType, index, { name: val })}
          returnKeyType={nextId || (isLastInThisSection && firstOutputId) ? "next" : "done"}
          onSubmitEditing={() => {
            if (nextId) inputRefs.current[nextId]?.focus();
            else if (isLastInThisSection && firstOutputId) inputRefs.current[firstOutputId]?.focus();
          }}
          blurOnSubmit={false}
        />

        <TouchableOpacity 
          onPress={() => cycleConnector(portType, index)}
          className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded mr-2 min-w-[50px] items-center"
        >
          <Text className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
            {port.connectorType || '---'}
          </Text>
        </TouchableOpacity>

        {portType === 'input' && (
          <View className="flex-row items-center mr-2">
            <TouchableOpacity 
              onPress={() => updatePort('input', index, { phantomPower: !port.phantomPower })}
              className={`p-1 rounded mr-1 ${port.phantomPower ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <Zap size={12} color={port.phantomPower ? 'white' : '#9ca3af'} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => updatePort('input', index, { pad: !port.pad })}
              className={`px-1 py-0.5 rounded ${port.pad ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <Text className={`text-[8px] font-bold ${port.pad ? 'text-white' : 'text-gray-400'}`}>PAD</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => deletePort(portType, port.id)} className="p-1">
          <Trash2 size={14} color="#ef4444" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white dark:bg-gray-950"
      >
        <View className="flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity onPress={onClose}>
            <Text className="text-blue-500 text-lg">Cancel</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-black dark:text-white">
            {device ? 'Edit Device' : 'Add Device'}
          </Text>
          <TouchableOpacity onPress={handleSave}>
            <Text className="text-blue-500 text-lg font-bold">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 p-4">
          {/* Type Selector */}
          <View className="mb-4">
            <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Device Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
              {DEVICE_TYPES.map(t => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full mr-2 ${
                    type === t ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Text className={`text-xs ${type === t ? 'text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Identification */}
          <View className="mb-4">
            <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">
              {isTerminalSource ? 'Identification' : 'Device Info'}
            </Text>
            <View className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
              {isMic ? (
                <>
                  <TextInput
                    className="text-lg text-black dark:text-white mb-3 pb-2 border-b border-gray-200 dark:border-gray-800"
                    placeholder="General Name (e.g. Kick, Vocal)"
                    placeholderTextColor="#9ca3af"
                    value={generalName}
                    onChangeText={setGeneralName}
                  />
                  <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Mic Model</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-1">
                    {MIC_MODELS.map(m => (
                      <TouchableOpacity
                        key={m}
                        onPress={() => setSpecificType(m)}
                        className={`px-3 py-1.5 rounded-lg mr-2 ${
                          specificType === m ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <Text className={`text-xs ${specificType === m ? 'text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {specificType === 'Other' && (
                    <TextInput
                      className="text-base text-black dark:text-white mt-2 bg-white dark:bg-gray-800 rounded-lg p-2"
                      placeholder="Enter model..."
                      placeholderTextColor="#9ca3af"
                      autoFocus
                      onChangeText={setSpecificType}
                    />
                  )}
                  <View className="flex-row justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">Phantom Power Required</Text>
                    <Switch value={micPhantom} onValueChange={setMicPhantom} trackColor={{ true: '#facc15' }} />
                  </View>
                </>
              ) : isTerminalSource ? (
                <>
                  <TextInput
                    className="text-lg text-black dark:text-white mb-2 pb-2 border-b border-gray-200 dark:border-gray-800"
                    placeholder="General Name (e.g. Bass DI)"
                    placeholderTextColor="#9ca3af"
                    value={generalName}
                    onChangeText={setGeneralName}
                  />
                  <TextInput
                    className="text-lg text-black dark:text-white"
                    placeholder="Specific Model (e.g. J48)"
                    placeholderTextColor="#9ca3af"
                    value={specificType}
                    onChangeText={setSpecificType}
                  />
                </>
              ) : (
                <TextInput
                  className="text-lg text-black dark:text-white"
                  placeholder="Device Name (e.g. Stagebox A, WING)"
                  placeholderTextColor="#9ca3af"
                  value={name}
                  onChangeText={setName}
                />
              )}
            </View>
          </View>

          {/* Group & Category */}
          <View className="flex-row mb-4">
            <View className="flex-1 mr-2">
              <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Group</Text>
              <View className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
                  {groups.map(g => (
                    <TouchableOpacity
                      key={g.id}
                      onPress={() => setGroupId(groupId === g.id ? undefined : g.id)}
                      className={`px-3 py-1.5 rounded-lg mr-2`}
                      style={{ 
                        backgroundColor: groupId === g.id ? (g.color || '#3b82f6') : (Platform.OS === 'ios' ? '#e5e7eb' : '#374151'),
                        opacity: groupId && groupId !== g.id ? 0.5 : 1
                      }}
                    >
                      <Text className={`text-xs font-bold ${groupId === g.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{g.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {groups.length === 0 && <Text className="text-xs text-gray-400 p-1.5 italic">None defined</Text>}
                </ScrollView>
              </View>
            </View>
            <View className="flex-1 ml-2">
              <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Category</Text>
              <View className="bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="p-2">
                  {categories.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      onPress={() => setCategoryId(categoryId === c.id ? undefined : c.id)}
                      className={`px-3 py-1.5 rounded-lg mr-2`}
                      style={{ 
                        backgroundColor: categoryId === c.id ? (c.color || '#3b82f6') : (Platform.OS === 'ios' ? '#e5e7eb' : '#374151'),
                        opacity: categoryId && categoryId !== c.id ? 0.5 : 1
                      }}
                    >
                      <Text className={`text-xs font-bold ${categoryId === c.id ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{c.name}</Text>
                    </TouchableOpacity>
                  ))}
                  {categories.length === 0 && <Text className="text-xs text-gray-400 p-1.5 italic">None defined</Text>}
                </ScrollView>
              </View>
            </View>
          </View>

          {/* Port Management (Hidden for Mics) */}
          {!isMic && (
            <>
              <View className="mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Input Ports</Text>
                  <TouchableOpacity onPress={() => addPort('input')} className="flex-row items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Plus size={12} color="#3b82f6" />
                    <Text className="text-blue-500 text-[10px] font-bold ml-1">ADD</Text>
                  </TouchableOpacity>
                </View>
                {inputPorts.map((port, idx) => renderPortRow(port, idx, 'input'))}
                {inputPorts.length === 0 && <Text className="text-xs text-gray-400 italic mb-2 px-1">No inputs</Text>}
              </View>

              <View className="mb-8">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Output Ports</Text>
                  <TouchableOpacity onPress={() => addPort('output')} className="flex-row items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                    <Plus size={12} color="#3b82f6" />
                    <Text className="text-blue-500 text-[10px] font-bold ml-1">ADD</Text>
                  </TouchableOpacity>
                </View>
                {outputPorts.map((port, idx) => renderPortRow(port, idx, 'output'))}
                {outputPorts.length === 0 && <Text className="text-xs text-gray-400 italic mb-2 px-1">No outputs</Text>}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

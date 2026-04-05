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
import { Device, Channel, Group, Category } from '../models';
import { DEVICE_TYPES, CONNECTOR_TYPES, MIC_MODELS, CHANNEL_CONFIGS, DEVICE_TYPE_DEFAULTS, CHANNEL_CONFIG_TEMPLATES, ChannelConfig } from '../constants/DeviceLibrary';

interface DeviceModalProps {
  visible: boolean;
  device?: Device;
  groups: Group[];
  categories: Category[];
  onClose: () => void;
  onSave: (device: Omit<Device, 'id'> | Device) => void;
  onDelete?: (id: string) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

export function DeviceModal({ visible, device, groups, categories, onClose, onSave, onDelete }: DeviceModalProps) {
  const [name, setName] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState(DEVICE_TYPES[0]);
  const [generalName, setGeneralName] = useState('');
  const [groupId, setGroupId] = useState<string | undefined>(undefined);
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [inputChannels, setInputChannels] = useState<Channel[]>([]);
  const [outputChannels, setOutputChannels] = useState<Channel[]>([]);
  const [stagePosition, setStagePosition] = useState<'L' | 'C' | 'R' | undefined>(undefined);
  const [micPhantom, setMicPhantom] = useState(false);
  const [channelConfig, setChannelConfig] = useState<ChannelConfig>('Multi');
  const [showChannelNames, setShowChannelNames] = useState(false);
  const [isConfigManual, setIsConfigManual] = useState(false);
  const [isChannelsManual, setIsChannelsManual] = useState(false);

  const inputRefs = useRef<Record<string, TextInput | null>>({});

  const isMic = type === 'Microphone';
  const isTerminalSource = isMic || type === 'DI Box' || type === 'Instrument';

  const applyChannelConfig = (config: ChannelConfig, manual = false) => {
    setChannelConfig(config);
    if (manual) setIsConfigManual(true);
    
    if (config === 'Multi' || isChannelsManual) {
      if (config === 'Multi') setShowChannelNames(true);
      return;
    }
    
    setShowChannelNames(false);
    const tmpl = CHANNEL_CONFIG_TEMPLATES[config];
    setInputChannels(tmpl.inputs.map((t, i) => ({
      id: generateId(),
      number: i + 1,
      name: '',
      channelCount: 1,
      connectorType: t.connectorType,
      phantomPower: false,
      pad: false,
    })));
    setOutputChannels(tmpl.outputs.map((t, i) => ({
      id: generateId(),
      number: i + 1,
      name: '',
      channelCount: 1,
      connectorType: t.connectorType,
      phantomPower: false,
      pad: false,
    })));
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    if (!isConfigManual) {
      const defaultConfig = DEVICE_TYPE_DEFAULTS[newType] || 'Multi';
      applyChannelConfig(defaultConfig);
    }
  };

  useEffect(() => {
    if (device) {
      setName(device.name);
      setModel(device.model || '');
      setType(device.type);
      setGeneralName(device.metadata.generalName || '');
      setGroupId(device.groupId);
      setCategoryId(device.categoryId);
      setInputChannels(device.inputChannels);
      setOutputChannels(device.outputChannels);
      setStagePosition(device.metadata.stagePosition);
      setShowChannelNames(device.metadata.showChannelNames ?? false);
      setChannelConfig(DEVICE_TYPE_DEFAULTS[device.type] || 'Multi');
      setIsConfigManual(false); // Reset on load
      setIsChannelsManual(true); // Treat existing as manual to avoid overwrite
      if (device.type === 'Microphone' && device.outputChannels.length > 0) {
        setMicPhantom(device.outputChannels[0].phantomPower);
      }
    } else {
      setName('');
      setModel('');
      setType(DEVICE_TYPES[0]);
      setGeneralName('');
      setGroupId(undefined);
      setCategoryId(undefined);
      setInputChannels([]);
      setOutputChannels([]);
      setStagePosition(undefined);
      setMicPhantom(false);
      setShowChannelNames(false);
      const defaultConfig = DEVICE_TYPE_DEFAULTS[DEVICE_TYPES[0]] || 'Multi';
      setChannelConfig(defaultConfig);
      setIsConfigManual(false);
      setIsChannelsManual(false);
      // Initialize with defaults for new device
      applyChannelConfig(defaultConfig);
    }
  }, [device, visible]);

  const handleSave = () => {
    let finalName = isTerminalSource ? (generalName || name || 'Unnamed Device') : (name || 'Unnamed Device');
    
    let finalInputChannels = inputChannels;
    let finalOutputChannels = outputChannels;
    // We only force-override mic if it's NOT a multi-config or manual override
    if (isMic && !isChannelsManual && channelConfig !== 'Multi') {
      finalInputChannels = [];
      finalOutputChannels = [{
        id: outputChannels[0]?.id || generateId(),
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
      model: model || (isTerminalSource ? '' : undefined),
      type,
      groupId,
      categoryId,
      inputChannels: finalInputChannels,
      outputChannels: finalOutputChannels,
      metadata: {
        generalName: isTerminalSource ? generalName : undefined,
        stagePosition,
        showChannelNames,
      },
      position: device?.position || { x: 100, y: 100 }
    };

    onSave(deviceData as any);
    onClose();
  };

  const addChannel = (channelType: 'input' | 'output') => {
    setIsChannelsManual(true);
    const channels = channelType === 'input' ? inputChannels : outputChannels;
    const newChannel: Channel = {
      id: generateId(),
      number: channels.length + 1,
      name: '',
      channelCount: 1,
      connectorType: 'XLR',
      phantomPower: false,
      pad: false,
    };

    if (channelType === 'input') setInputChannels([...inputChannels, newChannel]);
    else setOutputChannels([...outputChannels, newChannel]);
  };

  const cycleConnector = (channelType: 'input' | 'output', index: number) => {
    setIsChannelsManual(true);
    const channels = channelType === 'input' ? [...inputChannels] : [...outputChannels];
    const current = channels[index].connectorType || CONNECTOR_TYPES[0];
    const currentIndex = CONNECTOR_TYPES.indexOf(current);
    const nextIndex = (currentIndex + 1) % CONNECTOR_TYPES.length;
    channels[index].connectorType = CONNECTOR_TYPES[nextIndex];
    
    if (channelType === 'input') setInputChannels(channels);
    else setOutputChannels(channels);
  };

  const updateChannel = (channelType: 'input' | 'output', index: number, updates: Partial<Channel>) => {
    setIsChannelsManual(true);
    if (channelType === 'input') {
      const newChannels = [...inputChannels];
      newChannels[index] = { ...newChannels[index], ...updates };
      setInputChannels(newChannels);
    } else {
      const newChannels = [...outputChannels];
      newChannels[index] = { ...newChannels[index], ...updates };
      setOutputChannels(newChannels);
    }
  };

  const deleteChannel = (channelType: 'input' | 'output', id: string) => {
    setIsChannelsManual(true);
    if (channelType === 'input') setInputChannels(inputChannels.filter(c => c.id !== id));
    else setOutputChannels(outputChannels.filter(c => c.id !== id));
  };

  const renderChannelRow = (channel: Channel, index: number, channelType: 'input' | 'output') => {
    const nextId = (channelType === 'input' ? inputChannels[index + 1] : outputChannels[index + 1])?.id;
    const isLastInThisSection = channelType === 'input' && index === inputChannels.length - 1;
    const firstOutputId = outputChannels[0]?.id;

    return (
      <View key={channel.id} className="flex-row items-center bg-gray-50 dark:bg-gray-800 rounded-lg px-2 py-1.5 mb-1.5">
        <Text className="text-gray-400 font-bold w-5 text-center mr-1">{channel.number}</Text>
        
        <TextInput
          ref={el => { inputRefs.current[channel.id] = el; }}
          className="flex-1 text-black dark:text-white font-medium mr-2"
          value={channel.name}
          placeholder="Name"
          placeholderTextColor="#9ca3af"
          onChangeText={(val) => updateChannel(channelType, index, { name: val })}
          returnKeyType={nextId || (isLastInThisSection && firstOutputId) ? "next" : "done"}
          onSubmitEditing={() => {
            if (nextId) inputRefs.current[nextId]?.focus();
            else if (isLastInThisSection && firstOutputId) inputRefs.current[firstOutputId]?.focus();
          }}
          blurOnSubmit={false}
        />

        <TouchableOpacity 
          onPress={() => cycleConnector(channelType, index)}
          className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded mr-2 min-w-[50px] items-center"
        >
          <Text className="text-[10px] font-bold text-gray-600 dark:text-gray-300">
            {channel.connectorType || '---'}
          </Text>
        </TouchableOpacity>

        {channelType === 'input' && (
          <View className="flex-row items-center mr-2">
            <TouchableOpacity 
              onPress={() => updateChannel('input', index, { phantomPower: !channel.phantomPower })}
              className={`p-1 rounded mr-1 ${channel.phantomPower ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <Zap size={12} color={channel.phantomPower ? 'white' : '#9ca3af'} />
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => updateChannel('input', index, { pad: !channel.pad })}
              className={`px-1 py-0.5 rounded ${channel.pad ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <Text className={`text-[8px] font-bold ${channel.pad ? 'text-white' : 'text-gray-400'}`}>PAD</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => deleteChannel(channelType, channel.id)} className="p-1">
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
                  onPress={() => handleTypeChange(t)}
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

          {/* Channel Config */}
          <View className="mb-4">
            <Text className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Channel Configuration</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
              {CHANNEL_CONFIGS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => applyChannelConfig(c)}
                  className={`px-3 py-1.5 rounded-full mr-2 ${
                    channelConfig === c ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Text className={`text-xs ${channelConfig === c ? 'text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                    {c}
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
                        onPress={() => setModel(m)}
                        className={`px-3 py-1.5 rounded-lg mr-2 ${
                          model === m ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <Text className={`text-xs ${model === m ? 'text-white font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {model === 'Other' && (
                    <TextInput
                      className="text-base text-black dark:text-white mt-2 bg-white dark:bg-gray-800 rounded-lg p-2"
                      placeholder="Enter model..."
                      placeholderTextColor="#9ca3af"
                      autoFocus
                      onChangeText={setModel}
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
                    value={model}
                    onChangeText={setModel}
                  />
                </>
              ) : (
                <>
                  <TextInput
                    className="text-lg text-black dark:text-white mb-2 pb-2 border-b border-gray-200 dark:border-gray-800"
                    placeholder="Device Name (e.g. Stagebox A, WING)"
                    placeholderTextColor="#9ca3af"
                    value={name}
                    onChangeText={setName}
                  />
                  <TextInput
                    className="text-lg text-black dark:text-white"
                    placeholder="Model (e.g. X32, DL16)"
                    placeholderTextColor="#9ca3af"
                    value={model}
                    onChangeText={setModel}
                  />
                </>
              )}

              <View className="flex-row justify-between items-center mt-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                <View className="flex-1 mr-4">
                  <Text className="text-sm font-medium text-gray-600 dark:text-gray-400">Show Channel Names</Text>
                  <Text className="text-[10px] text-gray-400">Show custom channel labels in the diagram</Text>
                </View>
                <Switch 
                  value={showChannelNames} 
                  onValueChange={setShowChannelNames} 
                  trackColor={{ true: '#3b82f6' }} 
                />
              </View>
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

          {/* Channel Management - Always shown for better visibility */}
          <View className="mb-4">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Input Channels</Text>
              <TouchableOpacity onPress={() => addChannel('input')} className="flex-row items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Plus size={12} color="#3b82f6" />
                <Text className="text-blue-500 text-[10px] font-bold ml-1">ADD</Text>
              </TouchableOpacity>
            </View>
            {inputChannels.map((channel, idx) => renderChannelRow(channel, idx, 'input'))}
            {inputChannels.length === 0 && <Text className="text-xs text-gray-400 italic mb-2 px-1">No inputs</Text>}
          </View>

          <View className="mb-8">
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Output Channels</Text>
              <TouchableOpacity onPress={() => addChannel('output')} className="flex-row items-center px-2 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Plus size={12} color="#3b82f6" />
                <Text className="text-blue-500 text-[10px] font-bold ml-1">ADD</Text>
              </TouchableOpacity>
            </View>
            {outputChannels.map((channel, idx) => renderChannelRow(channel, idx, 'output'))}
            {outputChannels.length === 0 && <Text className="text-xs text-gray-400 italic mb-2 px-1">No outputs</Text>}
          </View>

          {/* Delete Device Button */}
          {device && onDelete && (
            <TouchableOpacity 
              onPress={() => {
                onDelete(device.id);
                onClose();
              }}
              className="mt-8 mb-12 bg-red-50 dark:bg-red-900/10 py-4 rounded-xl flex-row justify-center items-center border border-red-100 dark:border-red-900/20"
            >
              <Trash2 size={18} color="#ef4444" />
              <View className="mr-2" />
              <Text className="text-red-500 font-bold text-base">Delete Device</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

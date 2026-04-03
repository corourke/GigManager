import React, { useState, useMemo } from 'react';
import { 
  Text, 
  View, 
  SectionList, 
  TouchableOpacity, 
  SafeAreaView, 
  StatusBar, 
  TextInput,
  ScrollView,
  Alert
} from 'react-native';
import { Plus, Search, Filter, X, LayoutGrid, Layers, Settings, FileText } from 'lucide-react-native';
import { useProject } from '../../contexts/ProjectContext';
import { DeviceCard } from '../../components/DeviceCard';
import { DeviceModal } from '../../components/DeviceModal';
import { ManageListModal } from '../../components/ManageListModal';
import { ProjectListModal } from '../../components/ProjectListModal';
import { SettingsModal } from '../../components/SettingsModal';
import { Device } from '../../models';
import { DEVICE_TYPES } from '../../constants/DeviceLibrary';

export default function SetupsScreen() {
  const { 
    project, 
    deleteDevice, 
    addDevice, 
    updateDevice,
    addGroup,
    updateGroup,
    deleteGroup,
    addCategory,
    updateCategory,
    deleteCategory
  } = useProject();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  
  const [isDeviceModalVisible, setIsDeviceModalVisible] = useState(false);
  const [isGroupModalVisible, setIsGroupModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [isProjectModalVisible, setIsProjectModalVisible] = useState(false);
  const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
  
  const [editingDevice, setEditingDevice] = useState<Device | undefined>(undefined);

  // Group devices for SectionList
  const sections = useMemo(() => {
    const filtered = project.devices.filter(device => {
      const name = device.name || '';
      const type = device.type || '';
      const search = searchQuery.toLowerCase();
      
      const matchesSearch = name.toLowerCase().includes(search) ||
                            type.toLowerCase().includes(search);
      const matchesType = !filterType || type === filterType;
      return matchesSearch && matchesType;
    });

    const groups: Record<string, Device[]> = {};
    const ungroupedKey = 'Other Devices';

    filtered.forEach(d => {
      const groupName = project.groups.find(g => g.id === d.groupId)?.name || ungroupedKey;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(d);
    });

    // Sort groups: explicit groups first, then 'Other'
    return Object.keys(groups)
      .sort((a, b) => {
        if (a === ungroupedKey) return 1;
        if (b === ungroupedKey) return -1;
        return a.localeCompare(b);
      })
      .map(title => ({
        title,
        data: groups[title].sort((a, b) => {
          const typeA = a.type || '';
          const typeB = b.type || '';
          const nameA = a.name || '';
          const nameB = b.name || '';
          return typeA.localeCompare(typeB) || nameA.localeCompare(nameB);
        })
      }));
  }, [project.devices, project.groups, project.categories, searchQuery, filterType]);

  const handleDeleteDevice = (id: string) => {
    Alert.alert(
      "Delete Device",
      "Are you sure you want to delete this device and all its connections?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteDevice(id) }
      ]
    );
  };

  const handleEditDevice = (device: Device) => {
    setEditingDevice(device);
    setIsDeviceModalVisible(true);
  };

  const handleAddDevice = () => {
    setEditingDevice(undefined);
    setIsDeviceModalVisible(true);
  };

  const handleSaveDevice = (deviceData: Omit<Device, 'id'> | Device) => {
    if ('id' in deviceData) {
      updateDevice(deviceData.id, deviceData);
    } else {
      addDevice(deviceData);
    }
    setIsDeviceModalVisible(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-gray-50 dark:bg-black">
      <StatusBar barStyle="default" />
      
      {/* Header */}
      <View className="px-6 pt-2 pb-2 bg-white dark:bg-gray-900 shadow-sm">
        <View className="flex-row justify-between items-center mb-3">
          <TouchableOpacity 
            className="flex-1 flex-row items-center mr-4"
            onPress={() => setIsProjectModalVisible(true)}
          >
            <Text 
              className="text-xl font-bold text-black dark:text-white mr-2"
              numberOfLines={1}
            >
              {project.name}
            </Text>
            <FileText size={18} color="#3b82f6" />
          </TouchableOpacity>
          
          <View className="flex-row items-center">
            <TouchableOpacity 
              className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mr-1.5"
              onPress={() => setIsGroupModalVisible(true)}
            >
              <LayoutGrid size={18} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mr-1.5"
              onPress={() => setIsCategoryModalVisible(true)}
            >
              <Layers size={18} color="#6b7280" />
            </TouchableOpacity>
            <TouchableOpacity 
              className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full mr-3"
              onPress={() => setIsSettingsModalVisible(true)}
            >
              <Settings size={18} color="#6b7280" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="flex-row items-center bg-blue-500 px-3 py-1.5 rounded-full shadow-sm"
              onPress={handleAddDevice}
            >
              <Plus size={18} color="white" />
              <Text className="text-white font-bold ml-1.5 mr-0.5">Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search and Filters */}
        <View className="flex-row items-center mb-1">
          <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5">
            <Search size={18} color="#6b7280" />
            <TextInput
              className="flex-1 ml-2 text-black dark:text-white py-1"
              placeholder="Search devices..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color="#6b7280" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Type Filters */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          className="flex-row py-2"
        >
          <TouchableOpacity 
            className={`px-4 py-2 rounded-full mr-2 ${!filterType ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'}`}
            onPress={() => setFilterType(null)}
          >
            <Text className={`font-medium ${!filterType ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
              All ({project.devices.length})
            </Text>
          </TouchableOpacity>
          {DEVICE_TYPES.map(type => {
            const count = project.devices.filter(d => d.type === type).length;
            if (count === 0 && filterType !== type) return null; // Only show if has devices or is selected
            
            return (
              <TouchableOpacity 
                key={type}
                className={`px-4 py-2 rounded-full mr-2 ${filterType === type ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-800'}`}
                onPress={() => setFilterType(type)}
              >
                <Text className={`font-medium ${filterType === type ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                  {type} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Device List */}
      <View style={{ flex: 1 }}>
        <SectionList
          style={{ flex: 1 }}
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeviceCard
              device={item}
              group={project.groups.find(g => g.id === item.groupId)}
              category={project.categories.find(c => c.id === item.categoryId)}
              onEdit={handleEditDevice}
              onDelete={handleDeleteDevice}
            />
          )}
          renderSectionHeader={({ section: { title } }) => {
            const group = project.groups.find(g => g.name === title);
            return (
              <View className="bg-gray-50 dark:bg-black px-4 pt-3 pb-1 mb-2 flex-row items-center">
                <View 
                  className="w-1.5 h-4 rounded-full mr-2" 
                  style={{ backgroundColor: group?.color || '#9ca3af' }} 
                />
                <Text className="text-gray-500 font-bold text-xs uppercase tracking-widest">
                  {title}
                </Text>
              </View>
            );
          }}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1, minHeight: '100%' }}
          stickySectionHeadersEnabled={true}
          ListEmptyComponent={() => (
            <View className="flex-1 items-center justify-center py-20">
              <Text className="text-gray-500 text-lg mb-2">No devices found</Text>
              <Text className="text-gray-400 text-sm">Tap the Add button to add your first device</Text>
            </View>
          )}
        />
      </View>

      <DeviceModal
        visible={isDeviceModalVisible}
        device={editingDevice}
        groups={project.groups}
        categories={project.categories}
        onClose={() => setIsDeviceModalVisible(false)}
        onSave={handleSaveDevice}
        onDelete={handleDeleteDevice}
      />

      <ManageListModal
        visible={isGroupModalVisible}
        title="Manage Groups"
        items={project.groups}
        onClose={() => setIsGroupModalVisible(false)}
        onAdd={(name, color) => addGroup({ name, color })}
        onUpdate={updateGroup}
        onDelete={deleteGroup}
      />

      <ManageListModal
        visible={isCategoryModalVisible}
        title="Manage Categories"
        items={project.categories}
        onClose={() => setIsCategoryModalVisible(false)}
        onAdd={(name, color) => addCategory({ name, color })}
        onUpdate={updateCategory}
        onDelete={deleteCategory}
      />

      <ProjectListModal
        visible={isProjectModalVisible}
        onClose={() => setIsProjectModalVisible(false)}
      />

      <SettingsModal
        visible={isSettingsModalVisible}
        onClose={() => setIsSettingsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

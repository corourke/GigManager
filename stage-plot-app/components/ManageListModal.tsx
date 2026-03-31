import React, { useState } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform 
} from 'react-native';
import { X, Plus, Trash2, Check } from 'lucide-react-native';

interface Item {
  id: string;
  name: string;
  color?: string;
}

interface ManageListModalProps {
  visible: boolean;
  title: string;
  items: Item[];
  onClose: () => void;
  onAdd: (name: string, color?: string) => void;
  onUpdate: (id: string, updates: Partial<Item>) => void;
  onDelete: (id: string) => void;
}

const COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', 
  '#ec4899', '#64748b'
];

export function ManageListModal({ 
  visible, 
  title, 
  items, 
  onClose, 
  onAdd, 
  onUpdate, 
  onDelete 
}: ManageListModalProps) {
  const [newItemName, setNewItemName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[6]);

  const handleAdd = () => {
    if (!newItemName.trim()) return;
    onAdd(newItemName, selectedColor);
    setNewItemName('');
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 bg-white dark:bg-gray-900"
      >
        <View className="flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
          <View className="w-20" />
          <Text className="text-xl font-bold text-black dark:text-white">{title}</Text>
          <TouchableOpacity onPress={onClose} className="w-20 items-end">
            <Text className="text-blue-500 text-lg font-bold">Done</Text>
          </TouchableOpacity>
        </View>

        <View className="p-4">
          <Text className="text-sm font-semibold text-gray-500 mb-2 uppercase">Add New</Text>
          <View className="flex-row items-center mb-4">
            <View className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mr-2">
              <TextInput
                className="text-lg text-black dark:text-white"
                placeholder="Name"
                placeholderTextColor="#9ca3af"
                value={newItemName}
                onChangeText={setNewItemName}
              />
            </View>
            <TouchableOpacity 
              onPress={handleAdd}
              disabled={!newItemName.trim()}
              className={`p-3 rounded-lg ${newItemName.trim() ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            >
              <Plus size={24} color="white" />
            </TouchableOpacity>
          </View>

          <View className="flex-row flex-wrap mb-6">
            {COLORS.map(color => (
              <TouchableOpacity
                key={color}
                onPress={() => setSelectedColor(color)}
                className="w-8 h-8 rounded-full m-1 items-center justify-center"
                style={{ backgroundColor: color }}
              >
                {selectedColor === color && <Check size={16} color="white" />}
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-semibold text-gray-500 mb-2 uppercase">Existing</Text>
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View className="flex-row items-center justify-between py-3 border-b border-gray-50 dark:border-gray-800">
                <View className="flex-row items-center">
                  <View 
                    className="w-4 h-4 rounded-full mr-3" 
                    style={{ backgroundColor: item.color || '#e2e8f0' }} 
                  />
                  <TextInput
                    className="text-lg text-black dark:text-white"
                    value={item.name}
                    onChangeText={(val) => onUpdate(item.id, { name: val })}
                  />
                </View>
                <TouchableOpacity onPress={() => onDelete(item.id)}>
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            )}
            ListEmptyComponent={() => (
              <Text className="text-gray-400 italic text-center py-10">No items yet</Text>
            )}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

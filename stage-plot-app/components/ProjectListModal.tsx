import React, { useState, useEffect } from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  FlatList, 
  Alert,
  ActivityIndicator,
  ScrollView
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X, Plus, Trash2, FileText, Copy, ArrowRight, Save, Layout } from 'lucide-react-native';
import { useProject } from '../contexts/ProjectContext';
import { ProjectMetadata } from '../services/PersistenceService';

interface ProjectListModalProps {
  visible: boolean;
  onClose: () => void;
}

export function ProjectListModal({ visible, onClose }: ProjectListModalProps) {
  const insets = useSafeAreaInsets();
  const { 
    project, 
    listProjects, 
    loadProject, 
    createNewProject, 
    deleteProject,
    saveAsTemplate,
    listTemplates,
    loadTemplate,
    deleteTemplate
  } = useProject();

  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [templates, setTemplates] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeTab, setActiveTab] = useState<'projects' | 'templates'>('projects');

  const fetchLists = async () => {
    try {
      setLoading(true);
      console.log('ProjectListModal: fetchLists start');
      const [pList, tList] = await Promise.all([listProjects(), listTemplates()]);
      console.log('ProjectListModal: fetchLists pList:', pList.length, 'tList:', tList.length);
      setProjects(pList);
      setTemplates(tList);
    } catch (err) {
      console.error('ProjectListModal: fetchLists error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchLists();
    }
  }, [visible]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await createNewProject(newProjectName);
    setNewProjectName('');
    onClose();
  };

  const handleLoadProject = async (id: string) => {
    await loadProject(id);
    onClose();
  };

  const handleLoadTemplate = async (id: string) => {
    await loadTemplate(id);
    onClose();
  };

  const handleDeleteProject = (id: string, name: string) => {
    Alert.alert(
      "Delete Project",
      `Are you sure you want to delete "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            await deleteProject(id);
            fetchLists();
          } 
        }
      ]
    );
  };

  const handleDeleteTemplate = (id: string, name: string) => {
    Alert.alert(
      "Delete Template",
      `Are you sure you want to delete template "${name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            await deleteTemplate(id);
            fetchLists();
          } 
        }
      ]
    );
  };

  const handleSaveAsTemplate = () => {
    Alert.prompt(
      "Save as Template",
      "Enter a name for the new template",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Save", 
          onPress: async (name?: string) => {
            if (name) {
              await saveAsTemplate(name);
              fetchLists();
            }
          } 
        }
      ],
      'plain-text',
      project.name
    );
  };

  const renderProjectItem = ({ item }: { item: ProjectMetadata }) => {
    const isCurrent = item.id === project.id;
    console.log(`ProjectListModal: Rendering project item: ${item.name}, isCurrent: ${isCurrent}`);
    return (
      <TouchableOpacity 
        className={`flex-row items-center justify-between p-4 mb-2 rounded-xl border ${isCurrent ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-white border-gray-100 dark:bg-gray-800 dark:border-gray-700 shadow-sm'}`}
        onPress={() => handleLoadProject(item.id)}
      >
        <View className="flex-row items-center flex-1">
          <View className={`p-2 rounded-lg mr-3 ${isCurrent ? 'bg-blue-500' : 'bg-gray-100 dark:bg-gray-700'}`}>
            <FileText size={20} color={isCurrent ? 'white' : '#6b7280'} />
          </View>
          <View>
            <Text className={`font-bold ${isCurrent ? 'text-blue-700 dark:text-blue-300' : 'text-black dark:text-white'}`}>
              {item.name}
            </Text>
            <Text className="text-gray-400 text-xs">
              Last modified: {new Date(item.updatedAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        
        {!isCurrent && (
          <TouchableOpacity 
            onPress={() => handleDeleteProject(item.id, item.name)}
            className="p-2"
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
        {isCurrent && (
          <View className="bg-blue-500 rounded-full px-2 py-1">
            <Text className="text-[10px] text-white font-bold uppercase">Current</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderTemplateItem = ({ item }: { item: ProjectMetadata }) => {
    return (
      <TouchableOpacity 
        className="flex-row items-center justify-between p-4 mb-2 rounded-xl bg-white border border-gray-100 dark:bg-gray-800 dark:border-gray-700 shadow-sm"
        onPress={() => handleLoadTemplate(item.id)}
      >
        <View className="flex-row items-center flex-1">
          <View className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3">
            <Layout size={20} color="#a855f7" />
          </View>
          <View>
            <Text className="font-bold text-black dark:text-white">
              {item.name}
            </Text>
            <Text className="text-gray-400 text-xs">
              Template
            </Text>
          </View>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => handleDeleteTemplate(item.id, item.name)}
            className="p-2 mr-2"
          >
            <Trash2 size={18} color="#ef4444" />
          </TouchableOpacity>
          <ArrowRight size={18} color="#9ca3af" />
        </View>
      </TouchableOpacity>
    );
  };

  console.log('ProjectListModal: Main render', { projectsCount: projects.length, loading, activeTab });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View 
        style={{ 
          flex: 1, 
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          backgroundColor: activeTab === 'projects' ? '#f9fafb' : '#f9fafb' // Will be overridden by tailwind
        }}
        className="bg-gray-50 dark:bg-black"
      >
        <View className="flex-row justify-between items-center p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
          <TouchableOpacity onPress={onClose} className="p-2">
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-black dark:text-white">Project Manager</Text>
          <TouchableOpacity onPress={handleSaveAsTemplate} className="p-2">
            <Copy size={24} color="#3b82f6" />
          </TouchableOpacity>
        </View>

        <View className="flex-row px-4 py-3 bg-white dark:bg-gray-900">
          <TouchableOpacity 
            className={`flex-1 py-2 items-center border-b-2 ${activeTab === 'projects' ? 'border-blue-500' : 'border-transparent'}`}
            onPress={() => setActiveTab('projects')}
          >
            <Text className={`font-bold ${activeTab === 'projects' ? 'text-blue-500' : 'text-gray-400'}`}>
              Projects ({projects.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 items-center border-b-2 ${activeTab === 'templates' ? 'border-blue-500' : 'border-transparent'}`}
            onPress={() => setActiveTab('templates')}
          >
            <Text className={`font-bold ${activeTab === 'templates' ? 'text-blue-500' : 'text-gray-400'}`}>
              Templates ({templates.length})
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'projects' && (
          <View className="px-4 py-4 bg-white dark:bg-gray-900 mb-2">
            <Text className="text-sm font-semibold text-gray-500 mb-2 uppercase">Create New Project</Text>
            <View className="flex-row items-center">
              <View className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2 mr-2">
                <TextInput
                  className="text-black dark:text-white h-10"
                  placeholder="Project name..."
                  placeholderTextColor="#9ca3af"
                  value={newProjectName}
                  onChangeText={setNewProjectName}
                />
              </View>
              <TouchableOpacity 
                onPress={handleCreateProject}
                disabled={!newProjectName.trim()}
                className={`w-12 h-12 rounded-full items-center justify-center ${newProjectName.trim() ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                <Plus size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View className="flex-1 px-4">
          <Text className="text-sm font-semibold text-gray-500 my-3 uppercase">
            {activeTab === 'projects' ? 'Existing Projects' : 'Project Templates'}
          </Text>
          
          {loading ? (
            <ActivityIndicator className="mt-10" />
          ) : (
            <FlatList
              data={activeTab === 'projects' ? projects : templates}
              keyExtractor={(item) => item.id}
              renderItem={activeTab === 'projects' ? renderProjectItem : renderTemplateItem}
              ListEmptyComponent={() => (
                <View className="items-center justify-center py-20">
                  <Text className="text-gray-400 italic">
                    No {activeTab} found
                  </Text>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 40 }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

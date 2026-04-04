import React from 'react';
import { 
  Modal, 
  View, 
  Text, 
  TouchableOpacity, 
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Alert,
  useColorScheme as useReactNativeColorScheme,
  Platform
} from 'react-native';
import { X, Sun, Moon, Monitor, Check, Trash2 } from 'lucide-react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useProject } from '../contexts/ProjectContext';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const { project, deleteProject } = useProject();
  const systemColorScheme = useReactNativeColorScheme();

  const handleDeleteCurrentProject = () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Are you sure you want to delete the current project "${project.name}"? This action cannot be undone.`);
      if (confirmed) {
        (async () => {
          console.log('SettingsModal: Deleting current project (WEB)', project.id);
          await deleteProject(project.id);
          onClose();
        })();
      }
      return;
    }

    Alert.alert(
      "Delete Current Project",
      `Are you sure you want to delete the current project "${project.name}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete Project", 
          style: "destructive", 
          onPress: async () => {
            console.log('SettingsModal: Deleting current project (NATIVE)', project.id);
            await deleteProject(project.id);
            onClose();
          } 
        }
      ]
    );
  };
  
  const currentMode = (theme === 'auto' ? systemColorScheme : theme) || 'light';

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.safeArea, { backgroundColor: currentMode === 'dark' ? '#000000' : '#f9fafb' }]}>
        <View style={[styles.header, { backgroundColor: currentMode === 'dark' ? '#111827' : '#ffffff', borderBottomColor: currentMode === 'dark' ? '#1f2937' : '#f3f4f6' }]}>
          <View style={{ width: 40 }} />
          <Text style={[styles.headerTitle, { color: currentMode === 'dark' ? '#ffffff' : '#000000' }]}>Settings</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          
          <View style={[styles.optionsWrapper, { backgroundColor: currentMode === 'dark' ? '#111827' : '#ffffff', borderColor: currentMode === 'dark' ? '#1f2937' : '#f3f4f6' }]}>
            {[
              { id: 'light', name: 'Light', icon: Sun },
              { id: 'dark', name: 'Dark', icon: Moon },
              { id: 'auto', name: 'System (Auto)', icon: Monitor },
            ].map((option, index) => {
              const Icon = option.icon;
              const isSelected = theme === option.id;
              
              return (
                <TouchableOpacity 
                  key={option.id}
                  style={[
                    styles.optionItem, 
                    index !== 2 && { borderBottomWidth: 1, borderBottomColor: currentMode === 'dark' ? '#1f2937' : '#f3f4f6' }
                  ]}
                  onPress={() => setTheme(option.id as any)}
                >
                  <View style={styles.optionLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: isSelected ? '#3b82f6' : (currentMode === 'dark' ? '#374151' : '#f3f4f6') }]}>
                      <Icon size={20} color={isSelected ? 'white' : '#6b7280'} />
                    </View>
                    <Text style={[styles.optionText, { color: currentMode === 'dark' ? '#ffffff' : '#000000', fontWeight: isSelected ? 'bold' : '400' }]}>
                      {option.name}
                    </Text>
                  </View>
                  
                  {isSelected && (
                    <Check size={20} color="#3b82f6" strokeWidth={3} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Project Management</Text>
          <View style={[styles.optionsWrapper, { backgroundColor: currentMode === 'dark' ? '#111827' : '#ffffff', borderColor: currentMode === 'dark' ? '#1f2937' : '#f3f4f6' }]}>
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={handleDeleteCurrentProject}
            >
              <View style={styles.optionLeft}>
                <View style={[styles.iconContainer, { backgroundColor: '#fee2e2' }]}>
                  <Trash2 size={20} color="#ef4444" />
                </View>
                <Text style={[styles.optionText, { color: '#ef4444', fontWeight: 'bold' }]}>
                  Delete Current Project
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Current Theme: {theme}
            </Text>
            <Text style={styles.versionText}>
              Stage Plot App v1.0.0
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  optionsWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    padding: 8,
    borderRadius: 8,
    marginRight: 12,
  },
  optionText: {
    fontSize: 18,
  },
  footer: {
    marginTop: 32,
    alignItems: 'center',
  },
  footerText: {
    color: '#9ca3af',
    fontSize: 12,
  },
  versionText: {
    color: '#9ca3af',
    fontSize: 10,
    marginTop: 4,
  }
});

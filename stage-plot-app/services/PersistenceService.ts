import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import { Project, ProjectSchema } from '../models';

const IS_WEB = Platform.OS === 'web' && typeof localStorage !== 'undefined';

const getProjectsDir = () => IS_WEB ? null : `${FileSystem.documentDirectory}projects/`;
const getTemplatesDir = () => IS_WEB ? null : `${FileSystem.documentDirectory}templates/`;

export interface ProjectMetadata {
  id: string;
  name: string;
  updatedAt: string;
  isTemplate?: boolean;
}

export const PersistenceService = {
  async ensureDirsExist() {
    if (IS_WEB) return;
    
    const projectsDir = getProjectsDir();
    const templatesDir = getTemplatesDir();
    
    if (projectsDir) {
      const info = await FileSystem.getInfoAsync(projectsDir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(projectsDir, { intermediates: true });
      }
    }
    if (templatesDir) {
      const info = await FileSystem.getInfoAsync(templatesDir);
      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(templatesDir, { intermediates: true });
      }
    }
  },

  async listProjects(): Promise<ProjectMetadata[]> {
    if (IS_WEB) {
      console.log('PersistenceService: listProjects (WEB) - localStorage.length:', localStorage.length);
      const projectMap = new Map<string, ProjectMetadata>();
      
      let keys: string[] = [];
      try {
        const storedKeys = localStorage.getItem('sp_project_keys');
        console.log('PersistenceService: raw sp_project_keys:', storedKeys);
        keys = JSON.parse(storedKeys || '[]');
      } catch (e) {
        console.error('PersistenceService: Failed to parse sp_project_keys', e);
        keys = [];
      }
      
      console.log('PersistenceService: parsed keys:', JSON.stringify(keys));

      // 1. Load from keys array
      for (const key of keys) {
        const storageKey = `sp_project_${key}`;
        const content = localStorage.getItem(storageKey);
        if (content) {
          try {
            const data = JSON.parse(content);
            if (data && data.id) {
              console.log(`PersistenceService: Found project from keys: ${data.id} (${data.name})`);
              projectMap.set(data.id, {
                id: data.id,
                name: data.name || 'Untitled Project',
                updatedAt: data.updatedAt || new Date().toISOString(),
                isTemplate: false,
              });
            } else {
              console.warn(`PersistenceService: Project at ${storageKey} has no ID or is invalid:`, content.substring(0, 50));
            }
          } catch (e) {
            console.error('PersistenceService: Error parsing localStorage project', key, e);
          }
        } else {
          console.warn('PersistenceService: No content found for key in sp_project_keys:', storageKey);
        }
      }

      // 2. Recovery: Scan for orphaned projects
      const allStoreKeys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) allStoreKeys.push(k);
      }

      for (const storageKey of allStoreKeys) {
        if (storageKey.startsWith('sp_project_') && storageKey !== 'sp_project_keys') {
          const content = localStorage.getItem(storageKey);
          if (content) {
            try {
              const data = JSON.parse(content);
              if (data && data.id && !projectMap.has(data.id)) {
                console.warn('PersistenceService: Recovered orphaned project from', storageKey, 'id:', data.id);
                projectMap.set(data.id, {
                  id: data.id,
                  name: data.name || 'Untitled Project',
                  updatedAt: data.updatedAt || new Date().toISOString(),
                  isTemplate: false,
                });
                if (!keys.includes(data.id)) {
                  keys.push(data.id);
                }
              }
            } catch (e) {
              console.error('PersistenceService: Error parsing potential orphan', storageKey, e);
            }
          }
        }
      }

      // Update keys if we found orphans
      const finalKeys = Array.from(projectMap.keys());
      if (finalKeys.length !== keys.length) {
        localStorage.setItem('sp_project_keys', JSON.stringify(finalKeys));
      }

      const result = Array.from(projectMap.values()).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      console.log('PersistenceService: listProjects returning', result.length, 'projects');
      return result;
    }

    try {
      console.log('PersistenceService: listProjects (NATIVE)');
      await this.ensureDirsExist();
      const projectsDir = getProjectsDir();
      if (!projectsDir) return [];
      
      const files = await FileSystem.readDirectoryAsync(projectsDir);
      const projects: ProjectMetadata[] = [];

      for (const fileName of files) {
        if (fileName.endsWith('.json')) {
          try {
            const content = await FileSystem.readAsStringAsync(`${projectsDir}${fileName}`);
            const data = JSON.parse(content);
            
            projects.push({
              id: data.id || fileName.replace('.json', ''),
              name: data.name || fileName.replace('.json', ''),
              updatedAt: data.updatedAt || new Date().toISOString(),
              isTemplate: false,
            });
          } catch (error) {
            console.error(`PersistenceService: Failed to read/parse project file: ${fileName}`, error);
          }
        }
      }

      return projects.sort((a, b) => {
        const tA = new Date(a.updatedAt).getTime() || 0;
        const tB = new Date(b.updatedAt).getTime() || 0;
        return tB - tA;
      });
    } catch (error) {
      console.error('PersistenceService: Error listing native projects', error);
      return [];
    }
  },

  async listTemplates(): Promise<ProjectMetadata[]> {
    if (IS_WEB) {
      const templates: ProjectMetadata[] = [];
      const keys = JSON.parse(localStorage.getItem('sp_template_keys') || '[]');
      for (const key of keys) {
        const content = localStorage.getItem(`sp_template_${key}`);
        if (content) {
          try {
            const data = JSON.parse(content);
            templates.push({
              id: data.id,
              name: data.name,
              updatedAt: data.updatedAt,
              isTemplate: true,
            });
          } catch (e) {}
        }
      }
      return templates.sort((a, b) => a.name.localeCompare(b.name));
    }

    await this.ensureDirsExist();
    const templatesDir = getTemplatesDir();
    if (!templatesDir) return [];
    
    const files = await FileSystem.readDirectoryAsync(templatesDir);
    const templates: ProjectMetadata[] = [];

    for (const fileName of files) {
      if (fileName.endsWith('.json')) {
        try {
          const content = await FileSystem.readAsStringAsync(`${templatesDir}${fileName}`);
          const data = JSON.parse(content);
          templates.push({
            id: data.id,
            name: data.name,
            updatedAt: data.updatedAt,
            isTemplate: true,
          });
        } catch (error) {
          console.error(`Failed to read template file: ${fileName}`, error);
        }
      }
    }

    return templates.sort((a, b) => a.name.localeCompare(b.name));
  },

  async saveProject(project: Project): Promise<void> {
    if (IS_WEB) {
      localStorage.setItem(`sp_project_${project.id}`, JSON.stringify(project));
      const keys = JSON.parse(localStorage.getItem('sp_project_keys') || '[]');
      if (!keys.includes(project.id)) {
        keys.push(project.id);
        localStorage.setItem('sp_project_keys', JSON.stringify(keys));
      }
      return;
    }

    await this.ensureDirsExist();
    const projectsDir = getProjectsDir();
    if (projectsDir) {
      await FileSystem.writeAsStringAsync(`${projectsDir}${project.id}.json`, JSON.stringify(project));
    }
  },

  async loadProject(id: string): Promise<Project | null> {
    if (IS_WEB) {
      const storageKey = `sp_project_${id}`;
      let content = localStorage.getItem(storageKey);

      if (!content) {
        console.warn('PersistenceService: No content at', storageKey, '- scanning localStorage for id:', id);
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('sp_project_') && key !== 'sp_project_keys') {
            const candidate = localStorage.getItem(key);
            if (candidate) {
              try {
                const parsed = JSON.parse(candidate);
                if (parsed && parsed.id === id) {
                  console.warn('PersistenceService: Found project', id, 'under key:', key);
                  content = candidate;
                  break;
                }
              } catch { /* skip */ }
            }
          }
        }
      }

      if (!content) {
        console.warn('PersistenceService: Project not found in localStorage:', id);
        return null;
      }

      try {
        const data = JSON.parse(content);
        return ProjectSchema.parse(data);
      } catch (e) {
        console.error('PersistenceService: Failed to parse/validate project', id, e);
        return null;
      }
    }

    try {
      await this.ensureDirsExist();
      const projectsDir = getProjectsDir();
      if (!projectsDir) return null;

      const fileUri = `${projectsDir}${id}.json`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(content);
        return ProjectSchema.parse(data);
      }

      // Scan if not found by ID.json
      const files = await FileSystem.readDirectoryAsync(projectsDir);
      for (const fileName of files) {
        if (fileName.endsWith('.json')) {
          const content = await FileSystem.readAsStringAsync(`${projectsDir}${fileName}`);
          const data = JSON.parse(content);
          if (data.id === id) {
            return ProjectSchema.parse(data);
          }
        }
      }
      
      return null;
    } catch (error) {
      console.error(`PersistenceService: Failed to load project: ${id}`, error);
      return null;
    }
  },

  async deleteProject(id: string): Promise<void> {
    if (IS_WEB) {
      localStorage.removeItem(`sp_project_${id}`);
      const keys = JSON.parse(localStorage.getItem('sp_project_keys') || '[]');
      localStorage.setItem('sp_project_keys', JSON.stringify(keys.filter((k: string) => k !== id)));
      return;
    }

    const projectsDir = getProjectsDir();
    if (projectsDir) {
      const fileUri = `${projectsDir}${id}.json`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    }
  },

  async saveAsTemplate(project: Project): Promise<void> {
    if (IS_WEB) {
      localStorage.setItem(`sp_template_${project.id}`, JSON.stringify(project));
      const keys = JSON.parse(localStorage.getItem('sp_template_keys') || '[]');
      if (!keys.includes(project.id)) {
        keys.push(project.id);
        localStorage.setItem('sp_template_keys', JSON.stringify(keys));
      }
      return;
    }

    await this.ensureDirsExist();
    const templatesDir = getTemplatesDir();
    if (templatesDir) {
      await FileSystem.writeAsStringAsync(`${templatesDir}${project.id}.json`, JSON.stringify(project));
    }
  },

  async loadTemplate(id: string): Promise<Project | null> {
    if (IS_WEB) {
      const content = localStorage.getItem(`sp_template_${id}`);
      if (!content) return null;
      try {
        const data = JSON.parse(content);
        return ProjectSchema.parse(data);
      } catch (e) {
        return null;
      }
    }

    await this.ensureDirsExist();
    const templatesDir = getTemplatesDir();
    if (!templatesDir) return null;
    
    const fileUri = `${templatesDir}${id}.json`;
    try {
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        const content = await FileSystem.readAsStringAsync(fileUri);
        const data = JSON.parse(content);
        return ProjectSchema.parse(data);
      }
      return null;
    } catch (error) {
      console.error(`Failed to load template: ${id}`, error);
      return null;
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    if (IS_WEB) {
      localStorage.removeItem(`sp_template_${id}`);
      const keys = JSON.parse(localStorage.getItem('sp_template_keys') || '[]');
      localStorage.setItem('sp_template_keys', JSON.stringify(keys.filter((k: string) => k !== id)));
      return;
    }

    const templatesDir = getTemplatesDir();
    if (templatesDir) {
      const fileUri = `${templatesDir}${id}.json`;
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        await FileSystem.deleteAsync(fileUri);
      }
    }
  },

  async saveTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    if (IS_WEB) {
      localStorage.setItem('sp_theme', theme);
      return;
    }
    const themeFile = `${FileSystem.documentDirectory}theme.txt`;
    await FileSystem.writeAsStringAsync(themeFile, theme);
  },

  async getTheme(): Promise<'light' | 'dark' | 'auto'> {
    if (IS_WEB) {
      return (localStorage.getItem('sp_theme') as 'light' | 'dark' | 'auto') || 'auto';
    }
    
    const themeFile = `${FileSystem.documentDirectory}theme.txt`;
    try {
      const info = await FileSystem.getInfoAsync(themeFile);
      if (!info.exists) return 'auto';
      const content = await FileSystem.readAsStringAsync(themeFile);
      return (content as 'light' | 'dark' | 'auto') || 'auto';
    } catch (e) {
      return 'auto';
    }
  }
};

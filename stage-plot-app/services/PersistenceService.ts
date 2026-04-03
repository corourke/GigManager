import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { Project, ProjectSchema } from '../models';

const IS_WEB = Platform.OS === 'web' && typeof localStorage !== 'undefined';

const getProjectsDir = () => (IS_WEB || !FileSystem.documentDirectory) ? '' : `${FileSystem.documentDirectory}projects/`;
const getTemplatesDir = () => (IS_WEB || !FileSystem.documentDirectory) ? '' : `${FileSystem.documentDirectory}templates/`;

export interface ProjectMetadata {
  id: string;
  name: string;
  updatedAt: string;
  isTemplate?: boolean;
}

export const PersistenceService = {
  async ensureDirsExist() {
    if (IS_WEB || !FileSystem.documentDirectory) return;
    
    const projectsDir = getProjectsDir();
    const templatesDir = getTemplatesDir();
    
    try {
      const projectDirInfo = await FileSystem.getInfoAsync(projectsDir);
      if (!projectDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(projectsDir, { intermediates: true });
      }

      const templateDirInfo = await FileSystem.getInfoAsync(templatesDir);
      if (!templateDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(templatesDir, { intermediates: true });
      }
    } catch (e) {
      console.error('PersistenceService: Error in ensureDirsExist', e);
    }
  },

  async listProjects(): Promise<ProjectMetadata[]> {
    if (IS_WEB) {
      console.log('PersistenceService: listProjects (WEB)');
      const projects: ProjectMetadata[] = [];
      const keys = JSON.parse(localStorage.getItem('sp_project_keys') || '[]');
      for (const key of keys) {
        const content = localStorage.getItem(`sp_project_${key}`);
        if (content) {
          try {
            const data = JSON.parse(content);
            if (data && data.id) {
              projects.push({
                id: data.id,
                name: data.name || 'Untitled Project',
                updatedAt: data.updatedAt || new Date().toISOString(),
                isTemplate: false,
              });
            }
          } catch (e) {
            console.error('PersistenceService: Error parsing localStorage project', key, e);
          }
        }
      }
      return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    try {
      console.log('PersistenceService: listProjects (NATIVE)');
      await this.ensureDirsExist();
      const projectsDir = getProjectsDir();
      if (!projectsDir) {
        console.log('PersistenceService: No projects directory');
        return [];
      }
      
      const files = await FileSystem.readDirectoryAsync(projectsDir);
      console.log('PersistenceService: Files in projects dir:', files);
      const projects: ProjectMetadata[] = [];

      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const fileNameId = file.replace('.json', '');
            const filePath = `${projectsDir}${file}`;
            const content = await FileSystem.readAsStringAsync(filePath);
            const data = JSON.parse(content);
            
            // Use the ID from the data, but fallback to fileNameId if missing
            const projectId = data.id || fileNameId;
            
            console.log(`PersistenceService: Found project file: ${file}, id in data: ${data.id}`);
            
            projects.push({
              id: projectId,
              name: data.name || fileNameId,
              updatedAt: data.updatedAt || new Date().toISOString(),
              isTemplate: false,
            });
          } catch (error) {
            console.error(`PersistenceService: Failed to read/parse project file: ${file}`, error);
          }
        }
      }

      console.log('PersistenceService: Returning projects:', projects.length);
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
    const files = await FileSystem.readDirectoryAsync(templatesDir);
    const templates: ProjectMetadata[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const content = await FileSystem.readAsStringAsync(`${templatesDir}${file}`);
          const data = JSON.parse(content);
          templates.push({
            id: data.id,
            name: data.name,
            updatedAt: data.updatedAt,
            isTemplate: true,
          });
        } catch (error) {
          console.error(`Failed to read template file: ${file}`, error);
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
    const filePath = `${getProjectsDir()}${project.id}.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(project));
  },

  async loadProject(id: string): Promise<Project | null> {
    if (IS_WEB) {
      const content = localStorage.getItem(`sp_project_${id}`);
      if (!content) return null;
      try {
        const data = JSON.parse(content);
        return ProjectSchema.parse(data);
      } catch (e) {
        return null;
      }
    }

    try {
      await this.ensureDirsExist();
      const projectsDir = getProjectsDir();
      const filePath = `${projectsDir}${id}.json`;
      
      const fileInfo = await FileSystem.getInfoAsync(filePath);
      if (fileInfo.exists) {
        const content = await FileSystem.readAsStringAsync(filePath);
        const data = JSON.parse(content);
        return ProjectSchema.parse(data);
      }

      // If file not found by ID, maybe it's named differently? Search by scanning.
      console.log(`PersistenceService: File ${id}.json not found, scanning directory...`);
      const files = await FileSystem.readDirectoryAsync(projectsDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await FileSystem.readAsStringAsync(`${projectsDir}${file}`);
          const data = JSON.parse(content);
          if (data.id === id) {
            console.log(`PersistenceService: Found project ${id} in file ${file}`);
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

    await this.ensureDirsExist();
    const filePath = `${getProjectsDir()}${id}.json`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
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
    const filePath = `${getTemplatesDir()}${project.id}.json`;
    await FileSystem.writeAsStringAsync(filePath, JSON.stringify(project));
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
    const filePath = `${getTemplatesDir()}${id}.json`;
    try {
      const content = await FileSystem.readAsStringAsync(filePath);
      const data = JSON.parse(content);
      return ProjectSchema.parse(data);
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

    await this.ensureDirsExist();
    const filePath = `${getTemplatesDir()}${id}.json`;
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(filePath);
    }
  },

  async saveTheme(theme: 'light' | 'dark' | 'auto'): Promise<void> {
    if (IS_WEB) {
      localStorage.setItem('sp_theme', theme);
      return;
    }
    const themePath = `${FileSystem.documentDirectory}theme.txt`;
    await FileSystem.writeAsStringAsync(themePath, theme);
  },

  async getTheme(): Promise<'light' | 'dark' | 'auto'> {
    if (IS_WEB) {
      return (localStorage.getItem('sp_theme') as 'light' | 'dark' | 'auto') || 'auto';
    }
    
    if (!FileSystem.documentDirectory) return 'auto';
    
    const themePath = `${FileSystem.documentDirectory}theme.txt`;
    try {
      const fileInfo = await FileSystem.getInfoAsync(themePath);
      if (!fileInfo.exists) return 'auto';
      
      const content = await FileSystem.readAsStringAsync(themePath);
      return (content as 'light' | 'dark' | 'auto') || 'auto';
    } catch (e) {
      return 'auto';
    }
  }
};

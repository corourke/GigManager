import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { Project, Device, Group, Category, Connection, ProjectConfig } from '../models';
import { PersistenceService, ProjectMetadata } from '../services/PersistenceService';
import { DEMO_PROJECT } from '../constants/DemoProject';

interface ProjectContextType {
  project: Project;
  setProject: (project: Project) => void;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
  addDevice: (device: Omit<Device, 'id'>) => string;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  deleteDevice: (id: string) => void;
  addGroup: (group: Omit<Group, 'id'>) => string;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => string;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addConnection: (connection: Omit<Connection, 'id'>) => string;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
  findDeviceByName: (name: string) => Device | undefined;
  
  // UI state for cross-tab navigation
  editingDeviceId: string | null;
  setEditingDeviceId: (id: string | null) => void;
  
  // Persistence methods
  listProjects: () => Promise<ProjectMetadata[]>;
  loadProject: (id: string) => Promise<void>;
  createNewProject: (name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  saveAsTemplate: (name: string) => Promise<void>;
  listTemplates: () => Promise<ProjectMetadata[]>;
  loadTemplate: (id: string) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProjectState] = useState<Project>(DEMO_PROJECT);
  const projectRef = useRef(project);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    projectRef.current = project;
  }, [project]);
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const isSaving = useRef(false);

  const setProjectStateWithRef = useCallback((updater: (prev: Project) => Project) => {
    setProjectState((prev) => {
      const next = updater(prev);
      projectRef.current = next;
      return next;
    });
  }, []);

  const listProjects = useCallback(async () => {
    return PersistenceService.listProjects();
  }, []);

  const loadProject = useCallback(async (id: string) => {
    const loaded = await PersistenceService.loadProject(id);
    if (loaded) {
      console.log('ProjectContext: loadProject success:', loaded.id);
      setProjectStateWithRef(() => loaded);
    }
  }, [setProjectStateWithRef]);

  const createNewProject = useCallback(async (name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      config: { sortByGroup: false },
      devices: [],
      connections: [],
      groups: [],
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await PersistenceService.saveProject(newProject);
    setProjectStateWithRef(() => newProject);
  }, [setProjectStateWithRef]);

  const deleteProject = useCallback(async (id: string) => {
    console.log('ProjectContext: deleteProject', id);
    const targetProjectName = id === project.id ? project.name : 'Project';
    await PersistenceService.deleteProject(id);
    
    let message = `Project "${targetProjectName}" deleted.`;

    // If it was the demo project, re-create it immediately
    if (id === DEMO_PROJECT.id) {
      console.log('ProjectContext: Re-creating demo project after deletion');
      await PersistenceService.saveProject(DEMO_PROJECT);
      message = `Demo Project reset to original state.`;
    }

    if (Platform.OS === 'web') {
      window.alert(message);
    } else {
      Alert.alert("Success", message);
    }

    // If we deleted the current project, load another one or the demo project
    if (project.id === id) {
      const projects = await PersistenceService.listProjects();
      if (projects.length > 0) {
        // Try to load the first available project (could be the newly re-created demo)
        const nextId = projects[0].id;
        console.log('ProjectContext: Loading next project', nextId);
        await loadProject(nextId);
      } else {
        // Fallback: should not happen since we re-created demo above if it was deleted,
        // but for safety:
        console.log('ProjectContext: No projects left, using demo project');
        setProjectStateWithRef(() => DEMO_PROJECT);
      }
    }
  }, [project.id, project.name, loadProject, setProjectStateWithRef]);

  const saveAsTemplate = useCallback(async (name: string) => {
    const template: Project = {
      ...project,
      id: generateId(), // New ID for template
      name,
      updatedAt: new Date().toISOString(),
    };
    await PersistenceService.saveAsTemplate(template);
  }, [project]);

  const listTemplates = useCallback(async () => {
    return PersistenceService.listTemplates();
  }, []);

  const loadTemplate = useCallback(async (id: string) => {
    const template = await PersistenceService.loadTemplate(id);
    if (template) {
      // When loading a template, create a NEW project from it
      const newProject: Project = {
        ...template,
        id: generateId(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await PersistenceService.saveProject(newProject);
      setProjectStateWithRef(() => newProject);
    }
  }, [setProjectStateWithRef]);

  const deleteTemplate = useCallback(async (id: string) => {
    await PersistenceService.deleteTemplate(id);
  }, []);

  // Initialize: Load last project or create default
  useEffect(() => {
    const init = async () => {
      try {
        console.log('ProjectContext: init start');
        const projects = await listProjects();
        console.log('ProjectContext: init projects count:', projects.length);
        
        if (projects.length > 0) {
          const lastProject = await loadProject(projects[0].id);
          // loadProject already updates state
        } else {
          console.log('ProjectContext: no projects found, saving initial project');
          // First run, save initial project
          await PersistenceService.saveProject(DEMO_PROJECT);
          setProjectStateWithRef(() => DEMO_PROJECT);
        }
      } catch (err) {
        console.error('ProjectContext: init error:', err);
        setProjectStateWithRef(() => DEMO_PROJECT);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, [listProjects, loadProject, setProjectStateWithRef]);

  // Auto-save on project changes
  useEffect(() => {
    if (isInitialized && !isSaving.current) {
      isSaving.current = true;
      PersistenceService.saveProject(project).finally(() => {
        isSaving.current = false;
      });
    }
  }, [project, isInitialized]);

  const setProject = useCallback((newProject: Project) => {
    setProjectStateWithRef(() => ({
      ...newProject,
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const updateConfig = useCallback((updates: Partial<ProjectConfig>) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      config: { ...prev.config, ...updates },
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const addDevice = useCallback((device: Omit<Device, 'id'>) => {
    const id = generateId();
    setProjectStateWithRef((prev) => ({
      ...prev,
      devices: [...prev.devices, { ...device, id }],
      updatedAt: new Date().toISOString(),
    }));
    return id;
  }, [setProjectStateWithRef]);

  const updateDevice = useCallback((id: string, updates: Partial<Device>) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const deleteDevice = useCallback((id: string) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== id),
      connections: prev.connections.filter(c => c.sourceDeviceId !== id && c.destinationDeviceId !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const addGroup = useCallback((group: Omit<Group, 'id'>) => {
    const id = generateId();
    setProjectStateWithRef((prev) => ({
      ...prev,
      groups: [...prev.groups, { ...group, id }],
      updatedAt: new Date().toISOString(),
    }));
    return id;
  }, [setProjectStateWithRef]);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const deleteGroup = useCallback((id: string) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== id),
      devices: prev.devices.map(d => d.groupId === id ? { ...d, groupId: undefined } : d),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const id = generateId();
    setProjectStateWithRef((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...category, id }],
      updatedAt: new Date().toISOString(),
    }));
    return id;
  }, [setProjectStateWithRef]);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const deleteCategory = useCallback((id: string) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      devices: prev.devices.map(d => d.categoryId === id ? { ...d, categoryId: undefined } : d),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);
  
  const addConnection = useCallback((connection: Omit<Connection, 'id'>) => {
    const id = generateId();
    setProjectStateWithRef((prev) => ({
      ...prev,
      connections: [
        ...prev.connections.filter(c => 
          !(c.sourceDeviceId === connection.sourceDeviceId && c.sourceChannelId === connection.sourceChannelId) &&
          !(c.destinationDeviceId === connection.destinationDeviceId && c.destinationChannelId === connection.destinationChannelId)
        ),
        { ...connection, id }
      ],
      updatedAt: new Date().toISOString(),
    }));
    return id;
  }, [setProjectStateWithRef]);

  const updateConnection = useCallback((id: string, updates: Partial<Connection>) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      connections: prev.connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const deleteConnection = useCallback((id: string) => {
    setProjectStateWithRef((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, [setProjectStateWithRef]);

  const findDeviceByName = useCallback((name: string) => {
    if (!name) return undefined;
    const lowerName = name.toLowerCase();
    // Prioritize exact match
    const exact = projectRef.current.devices.find(d => d.name.toLowerCase() === lowerName);
    if (exact) return exact;
    
    // Fallback to startsWith for suggestions
    return projectRef.current.devices.find(d => d.name.toLowerCase().startsWith(lowerName));
  }, []);

  const value = React.useMemo(() => ({
    project,
    setProject,
    updateConfig,
    addDevice,
    updateDevice,
    deleteDevice,
    addGroup,
    updateGroup,
    deleteGroup,
    addCategory,
    updateCategory,
    deleteCategory,
    addConnection,
    updateConnection,
    deleteConnection,
    findDeviceByName,
    editingDeviceId,
    setEditingDeviceId,
    listProjects,
    loadProject,
    createNewProject,
    deleteProject,
    saveAsTemplate,
    listTemplates,
    loadTemplate,
    deleteTemplate,
  }), [
    project,
    setProject,
    addDevice,
    updateDevice,
    deleteDevice,
    addGroup,
    updateGroup,
    deleteGroup,
    addCategory,
    updateCategory,
    deleteCategory,
    addConnection,
    updateConnection,
    deleteConnection,
    findDeviceByName,
    editingDeviceId,
    setEditingDeviceId,
    listProjects,
    loadProject,
    createNewProject,
    deleteProject,
    saveAsTemplate,
    listTemplates,
    loadTemplate,
    deleteTemplate,
  ]);

  return (
    <ProjectContext.Provider value={value}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

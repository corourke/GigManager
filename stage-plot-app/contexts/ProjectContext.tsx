import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import { Project, Device, Group, Category, Connection } from '../models';
import { PersistenceService, ProjectMetadata } from '../services/PersistenceService';
import { DEMO_PROJECT } from '../constants/DemoProject';

interface ProjectContextType {
  project: Project;
  setProject: (project: Project) => void;
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
  const [isInitialized, setIsInitialized] = useState(false);
  const isSaving = useRef(false);

  const listProjects = useCallback(async () => {
    return PersistenceService.listProjects();
  }, []);

  const loadProject = useCallback(async (id: string) => {
    const loaded = await PersistenceService.loadProject(id);
    if (loaded) {
      console.log('ProjectContext: loadProject success:', loaded.id);
      setProjectState(loaded);
    }
  }, []);

  const createNewProject = useCallback(async (name: string) => {
    const newProject: Project = {
      id: generateId(),
      name,
      devices: [],
      connections: [],
      groups: [],
      categories: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await PersistenceService.saveProject(newProject);
    setProjectState(newProject);
  }, []);

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
        setProjectState(DEMO_PROJECT);
      }
    }
  }, [project.id, project.name, loadProject]);

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
      setProjectState(newProject);
    }
  }, []);

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
          setProjectState(DEMO_PROJECT);
        }
      } catch (err) {
        console.error('ProjectContext: init error:', err);
        setProjectState(DEMO_PROJECT);
      } finally {
        setIsInitialized(true);
      }
    };
    init();
  }, [listProjects, loadProject]);

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
    setProjectState({
      ...newProject,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const addDevice = useCallback((device: Omit<Device, 'id'>) => {
    const id = generateId();
    setProjectState((prev) => ({
      ...prev,
      devices: [...prev.devices, { ...device, id }],
      updatedAt: new Date().toISOString(),
    }));
    return id;
  }, []);

  const updateDevice = useCallback((id: string, updates: Partial<Device>) => {
    setProjectState((prev) => ({
      ...prev,
      devices: prev.devices.map((d) => (d.id === id ? { ...d, ...updates } : d)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteDevice = useCallback((id: string) => {
    setProjectState((prev) => ({
      ...prev,
      devices: prev.devices.filter((d) => d.id !== id),
      connections: prev.connections.filter(c => c.sourceDeviceId !== id && c.destinationDeviceId !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addGroup = useCallback((group: Omit<Group, 'id'>) => {
    const id = generateId();
    setProjectState((prev) => ({
      ...prev,
      groups: [...prev.groups, { ...group, id }],
      updatedAt: new Date().toISOString(),
    }));
    return id;
  }, []);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => {
    setProjectState((prev) => ({
      ...prev,
      groups: prev.groups.map((g) => (g.id === id ? { ...g, ...updates } : g)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setProjectState((prev) => ({
      ...prev,
      groups: prev.groups.filter((g) => g.id !== id),
      devices: prev.devices.map(d => d.groupId === id ? { ...d, groupId: undefined } : d),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    const id = generateId();
    setProjectState((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...category, id }],
      updatedAt: new Date().toISOString(),
    }));
    return id;
  }, []);

  const updateCategory = useCallback((id: string, updates: Partial<Category>) => {
    setProjectState((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteCategory = useCallback((id: string) => {
    setProjectState((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      devices: prev.devices.map(d => d.categoryId === id ? { ...d, categoryId: undefined } : d),
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const addConnection = useCallback((connection: Omit<Connection, 'id'>) => {
    const id = generateId();
    setProjectState((prev) => ({
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
  }, []);

  const updateConnection = useCallback((id: string, updates: Partial<Connection>) => {
    setProjectState((prev) => ({
      ...prev,
      connections: prev.connections.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const deleteConnection = useCallback((id: string) => {
    setProjectState((prev) => ({
      ...prev,
      connections: prev.connections.filter((c) => c.id !== id),
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const value = React.useMemo(() => ({
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

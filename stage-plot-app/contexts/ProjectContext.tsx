import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Project, Device, Group, Category, Connection } from '../models';
import { PersistenceService, ProjectMetadata } from '../services/PersistenceService';

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

const INITIAL_PROJECT: Project = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Demo Project',
  devices: [
    {
      id: 'dev-vox1',
      name: 'VOX 1',
      type: 'Microphone',
      model: 'SM58',
      inputChannels: [],
      outputChannels: [{ id: 'ch-vox1-out', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false }],
      position: { x: 20, y: 30 },
      metadata: { generalName: 'VOX 1' },
      isSource: true,
      groupId: 'grp-stage',
    },
    {
      id: 'dev-vox2',
      name: 'VOX 2',
      type: 'Microphone',
      model: 'SM58',
      inputChannels: [],
      outputChannels: [{ id: 'ch-vox2-out', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false }],
      position: { x: 20, y: 80 },
      metadata: { generalName: 'VOX 2' },
      isSource: true,
      groupId: 'grp-stage',
    },
    {
      id: 'dev-kick',
      name: 'Kick',
      type: 'Microphone',
      model: 'Beta 52',
      inputChannels: [],
      outputChannels: [{ id: 'ch-kick-out', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false }],
      position: { x: 20, y: 130 },
      metadata: { generalName: 'Kick' },
      isSource: true,
      groupId: 'grp-stage',
    },
    {
      id: 'dev-snare',
      name: 'Snare',
      type: 'Microphone',
      model: 'SM57',
      inputChannels: [],
      outputChannels: [{ id: 'ch-snare-out', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false }],
      position: { x: 20, y: 180 },
      metadata: { generalName: 'Snare' },
      isSource: true,
      groupId: 'grp-stage',
    },
    {
      id: 'dev-tom',
      name: 'Tom',
      type: 'Microphone',
      model: 'e904',
      inputChannels: [],
      outputChannels: [{ id: 'ch-tom-out', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false }],
      position: { x: 20, y: 230 },
      metadata: { generalName: 'Tom' },
      isSource: true,
      groupId: 'grp-stage',
    },
    {
      id: 'dev-keys',
      name: 'Keys',
      type: 'Instrument',
      model: 'Nord Stage',
      inputChannels: [],
      outputChannels: [
        { id: 'ch-keys-outl', number: 1, name: '', channelCount: 1, connectorType: '1/4"', phantomPower: false, pad: false },
        { id: 'ch-keys-outr', number: 2, name: '', channelCount: 1, connectorType: '1/4"', phantomPower: false, pad: false },
      ],
      position: { x: 20, y: 280 },
      metadata: { generalName: 'Keys' },
      isSource: true,
      groupId: 'grp-stage',
    },
    {
      id: 'dev-stagebox',
      name: 'Stagebox A',
      type: 'Stagebox',
      model: 'S16',
      inputChannels: [
        { id: 'ch-sb-in1', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false },
        { id: 'ch-sb-in2', number: 2, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false },
        { id: 'ch-sb-in3', number: 3, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false },
        { id: 'ch-sb-in4', number: 4, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false },
        { id: 'ch-sb-in5', number: 5, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false },
        { id: 'ch-sb-in6', number: 6, name: '', channelCount: 1, connectorType: '1/4"', phantomPower: false, pad: false },
        { id: 'ch-sb-in7', number: 7, name: '', channelCount: 1, connectorType: '1/4"', phantomPower: false, pad: false },
      ],
      outputChannels: [
        { id: 'ch-sb-out1', number: 1, name: '', channelCount: 1, connectorType: 'AES50', phantomPower: false, pad: false },
      ],
      position: { x: 350, y: 100 },
      metadata: {},
      groupId: 'grp-stage',
    },
    {
      id: 'dev-mixer',
      name: 'FOH Mixer',
      type: 'Mixer',
      model: 'X32',
      inputChannels: [
        { id: 'ch-mx-in1', number: 1, name: '', channelCount: 1, connectorType: 'AES50', phantomPower: false, pad: false },
      ],
      outputChannels: [
        { id: 'ch-mx-out1', number: 1, name: 'Main L', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false },
        { id: 'ch-mx-out2', number: 2, name: 'Main R', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false },
      ],
      position: { x: 650, y: 150 },
      metadata: {},
      groupId: 'grp-foh',
      isInternallyRoutable: true,
    },
    {
      id: 'dev-spk-l',
      name: 'Main L',
      type: 'Speaker',
      model: 'EV ELX',
      inputChannels: [{ id: 'ch-spkl-in', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false }],
      outputChannels: [],
      position: { x: 950, y: 50 },
      metadata: {},
    },
    {
      id: 'dev-spk-r',
      name: 'Main R',
      type: 'Speaker',
      model: 'EV ELX',
      inputChannels: [{ id: 'ch-spkr-in', number: 1, name: '', channelCount: 1, connectorType: 'XLR', phantomPower: false, pad: false }],
      outputChannels: [],
      position: { x: 950, y: 250 },
      metadata: {},
    },
  ],
  connections: [
    { id: 'conn-1', sourceDeviceId: 'dev-vox1', sourceChannelId: 'ch-vox1-out', destinationDeviceId: 'dev-stagebox', destinationChannelId: 'ch-sb-in1' },
    { id: 'conn-2', sourceDeviceId: 'dev-vox2', sourceChannelId: 'ch-vox2-out', destinationDeviceId: 'dev-stagebox', destinationChannelId: 'ch-sb-in2' },
    { id: 'conn-3', sourceDeviceId: 'dev-kick', sourceChannelId: 'ch-kick-out', destinationDeviceId: 'dev-stagebox', destinationChannelId: 'ch-sb-in3' },
    { id: 'conn-4', sourceDeviceId: 'dev-snare', sourceChannelId: 'ch-snare-out', destinationDeviceId: 'dev-stagebox', destinationChannelId: 'ch-sb-in4' },
    { id: 'conn-5', sourceDeviceId: 'dev-tom', sourceChannelId: 'ch-tom-out', destinationDeviceId: 'dev-stagebox', destinationChannelId: 'ch-sb-in5' },
    { id: 'conn-6', sourceDeviceId: 'dev-keys', sourceChannelId: 'ch-keys-outl', destinationDeviceId: 'dev-stagebox', destinationChannelId: 'ch-sb-in6' },
    { id: 'conn-7', sourceDeviceId: 'dev-keys', sourceChannelId: 'ch-keys-outr', destinationDeviceId: 'dev-stagebox', destinationChannelId: 'ch-sb-in7' },
    { id: 'conn-8', sourceDeviceId: 'dev-stagebox', sourceChannelId: 'ch-sb-out1', destinationDeviceId: 'dev-mixer', destinationChannelId: 'ch-mx-in1' },
    { id: 'conn-9', sourceDeviceId: 'dev-mixer', sourceChannelId: 'ch-mx-out1', destinationDeviceId: 'dev-spk-l', destinationChannelId: 'ch-spkl-in' },
    { id: 'conn-10', sourceDeviceId: 'dev-mixer', sourceChannelId: 'ch-mx-out2', destinationDeviceId: 'dev-spk-r', destinationChannelId: 'ch-spkr-in' },
  ],
  groups: [
    { id: 'grp-stage', name: 'Stage', color: '#22c55e' },
    { id: 'grp-foh', name: 'FOH', color: '#3b82f6' },
  ],
  categories: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProjectState] = useState<Project>(INITIAL_PROJECT);
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
    await PersistenceService.deleteProject(id);
    // If we deleted current project, load another one or create new
    if (project.id === id) {
      const projects = await PersistenceService.listProjects();
      if (projects.length > 0) {
        await loadProject(projects[0].id);
      } else {
        await createNewProject('New Project');
      }
    }
  }, [project.id, loadProject, createNewProject]);

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
          await PersistenceService.saveProject(INITIAL_PROJECT);
          setProjectState(INITIAL_PROJECT);
        }
      } catch (err) {
        console.error('ProjectContext: init error:', err);
        setProjectState(INITIAL_PROJECT);
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

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Project, Device, Group, Category, Connection, ProjectSchema } from '../models';

interface ProjectContextType {
  project: Project;
  setProject: (project: Project) => void;
  addDevice: (device: Omit<Device, 'id'>) => void;
  updateDevice: (id: string, updates: Partial<Device>) => void;
  deleteDevice: (id: string) => void;
  addGroup: (group: Omit<Group, 'id'>) => void;
  updateGroup: (id: string, updates: Partial<Group>) => void;
  deleteGroup: (id: string) => void;
  addCategory: (category: Omit<Category, 'id'>) => void;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;
  addConnection: (connection: Omit<Connection, 'id'>) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

const INITIAL_PROJECT: Project = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  name: 'Demo Project',
  devices: [
    {
      id: '550e8400-e29b-41d4-a716-446655440001',
      name: 'Wireless Mic 1',
      type: 'Microphone',
      inputPorts: [],
      outputPorts: [{ id: '550e8400-e29b-41d4-a716-446655440002', number: 1, name: 'Out', channelCount: 1, phantomPower: false, pad: false }],
      position: { x: 50, y: 100 },
      metadata: { generalName: 'Lead Vocals' },
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440003',
      name: 'Stagebox A',
      type: 'Stagebox',
      inputPorts: [
        { id: '550e8400-e29b-41d4-a716-446655440004', number: 1, name: 'In 1', channelCount: 1, phantomPower: false, pad: false },
        { id: '550e8400-e29b-41d4-a716-446655440005', number: 2, name: 'In 2', channelCount: 1, phantomPower: false, pad: false },
      ],
      outputPorts: [{ id: '550e8400-e29b-41d4-a716-446655440006', number: 1, name: 'Main', channelCount: 2, phantomPower: false, pad: false }],
      position: { x: 250, y: 150 },
      metadata: {},
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440007',
      name: 'FOH Mixer',
      type: 'Mixer',
      inputPorts: [{ id: '550e8400-e29b-41d4-a716-446655440008', number: 1, name: 'Ch 1', channelCount: 1, phantomPower: false, pad: false }],
      outputPorts: [],
      position: { x: 450, y: 100 },
      metadata: {},
    },
  ],
  connections: [
    {
      id: '550e8400-e29b-41d4-a716-446655440009',
      sourceDeviceId: '550e8400-e29b-41d4-a716-446655440001',
      sourcePortId: '550e8400-e29b-41d4-a716-446655440002',
      destinationDeviceId: '550e8400-e29b-41d4-a716-446655440003',
      destinationPortId: '550e8400-e29b-41d4-a716-446655440004',
    },
    {
      id: '550e8400-e29b-41d4-a716-446655440010',
      sourceDeviceId: '550e8400-e29b-41d4-a716-446655440003',
      sourcePortId: '550e8400-e29b-41d4-a716-446655440006',
      destinationDeviceId: '550e8400-e29b-41d4-a716-446655440007',
      destinationPortId: '550e8400-e29b-41d4-a716-446655440008',
    },
  ],
  groups: [],
  categories: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [project, setProjectState] = useState<Project>(INITIAL_PROJECT);

  const setProject = useCallback((newProject: Project) => {
    setProjectState({
      ...newProject,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  const addDevice = useCallback((device: Omit<Device, 'id'>) => {
    setProjectState((prev) => ({
      ...prev,
      devices: [...prev.devices, { ...device, id: generateId() }],
      updatedAt: new Date().toISOString(),
    }));
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
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addGroup = useCallback((group: Omit<Group, 'id'>) => {
    setProjectState((prev) => ({
      ...prev,
      groups: [...prev.groups, { ...group, id: generateId() }],
      updatedAt: new Date().toISOString(),
    }));
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
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const addCategory = useCallback((category: Omit<Category, 'id'>) => {
    setProjectState((prev) => ({
      ...prev,
      categories: [...prev.categories, { ...category, id: generateId() }],
      updatedAt: new Date().toISOString(),
    }));
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
      updatedAt: new Date().toISOString(),
    }));
  }, []);
  
  const addConnection = useCallback((connection: Omit<Connection, 'id'>) => {
    setProjectState((prev) => ({
      ...prev,
      connections: [...prev.connections, { ...connection, id: generateId() }],
      updatedAt: new Date().toISOString(),
    }));
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

  return (
    <ProjectContext.Provider
      value={{
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
      }}
    >
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

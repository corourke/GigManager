import { z } from 'zod';

export const PortSchema = z.object({
  id: z.string().uuid(),
  number: z.number().int().min(1),
  name: z.string().optional(),
  channelCount: z.number().int().min(1).default(1),
  connectorType: z.string().optional(), // e.g., 'XLR', 'TRS', 'TS'
});

export const MetadataSchema = z.object({
  phantomPower: z.boolean().default(false),
  pad: z.boolean().default(false),
  gainNote: z.string().optional(),
  stagePosition: z.enum(['L', 'C', 'R']).optional(),
  generalName: z.string().optional(), // e.g., 'Kick'
  specificType: z.string().optional(), // e.g., 'SM92a'
});

export const DeviceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.string(), // e.g., 'Microphone', 'DI', 'Stagebox'
  categoryId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  inputPorts: z.array(PortSchema).default([]),
  outputPorts: z.array(PortSchema).default([]),
  metadata: MetadataSchema.default({
    phantomPower: false,
    pad: false,
  }),
});

export const ConnectionSchema = z.object({
  id: z.string().uuid(),
  sourceDeviceId: z.string().uuid(),
  sourcePortId: z.string().uuid(),
  destinationDeviceId: z.string().uuid(),
  destinationPortId: z.string().uuid(),
  channelMapping: z.record(z.string(), z.string()).optional(), // Map source channels to destination channels
  cableLength: z.number().optional(), // in ft or m
  cableLabel: z.string().optional(),
  cableType: z.string().optional(),
});

export const GroupSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
});

export const CategorySchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  color: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  notes: z.string().optional(),
  devices: z.array(DeviceSchema).default([]),
  connections: z.array(ConnectionSchema).default([]),
  groups: z.array(GroupSchema).default([]),
  categories: z.array(CategorySchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Port = z.infer<typeof PortSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Project = z.infer<typeof ProjectSchema>;

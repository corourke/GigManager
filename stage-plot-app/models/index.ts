import { z } from 'zod';

export const ChannelSchema = z.object({
  id: z.string(),
  number: z.number().int().min(1),
  name: z.string().optional(), // Blank/null by default to allow propagation
  channelCount: z.number().int().min(1).default(1),
  connectorType: z.string().optional(), // e.g., 'XLR', 'TRS', 'TS'
  phantomPower: z.boolean().optional().default(false),
  pad: z.boolean().optional().default(false),
});

export const MetadataSchema = z.object({
  gainNote: z.string().optional(),
  stagePosition: z.enum(['L', 'C', 'R']).optional(),
  generalName: z.string().optional(), // e.g., 'Kick'
});

export const DeviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(), // e.g., 'Microphone', 'DI', 'Stagebox'
  model: z.string().optional(), // e.g., 'SM58', 'X32'
  categoryId: z.string().optional(),
  groupId: z.string().optional(),
  inputChannels: z.array(ChannelSchema).default([]),
  outputChannels: z.array(ChannelSchema).default([]),
  metadata: MetadataSchema.default({}),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  isSource: z.boolean().optional(),
});

export const ConnectionSchema = z.object({
  id: z.string(),
  sourceDeviceId: z.string(),
  sourceChannelId: z.string(),
  destinationDeviceId: z.string(),
  destinationChannelId: z.string(),
  channelMapping: z.record(z.string(), z.string()).optional(), // Map source channels to destination channels
  cableLength: z.number().optional(), // in ft or m
  cableLabel: z.string().optional(),
  cableType: z.string().optional(),
});

export const GroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  notes: z.string().optional(),
  devices: z.array(DeviceSchema).default([]),
  connections: z.array(ConnectionSchema).default([]),
  groups: z.array(GroupSchema).default([]),
  categories: z.array(CategorySchema).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Channel = z.infer<typeof ChannelSchema>;
export type Metadata = z.infer<typeof MetadataSchema>;
export type Device = z.infer<typeof DeviceSchema>;
export type Connection = z.infer<typeof ConnectionSchema>;
export type Group = z.infer<typeof GroupSchema>;
export type Category = z.infer<typeof CategorySchema>;
export type Project = z.infer<typeof ProjectSchema>;

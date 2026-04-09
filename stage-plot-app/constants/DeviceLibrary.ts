export const DEVICE_TYPES = [
  'Microphone',
  'DI Box',
  'Stagebox',
  'Snake',
  'Mixer',
  'Amplifier',
  'Speaker',
  'Instrument',
  'Wireless Receiver',
  'Wireless Transmitter',
  'Other'
];

export const CONNECTOR_TYPES = [
  'XLR',
  '1/4"',
  'AES50',
  'Dante',
  'MADI',
  'USB',
  'Ethercon',
  'Speakon',
  'Powercon',
  'Truecon',
  'Other'
];

export const MIC_MODELS = [
  'SM58',
  'SM57',
  'Beta 52',
  'Beta 91A',
  'Beta 58',
  'Beta 57',
  'e904',
  'e906',
  'e609',
  'D6',
  'D4',
  'i5',
  'MD421',
  'MD441',
  'C414',
  'AT2020',
  'Other'
];

export const COMMON_NAMES = [
  'Kick', 'Snare', 'Hat', 'Tom', 'Rack-Tom', 'Floor-Tom', 'OH', 'Overhead',
  'Bass', 'Guitar', 'Acoustic', 'Acoustic-Gtr', 'Keys', 'Keys',
  'Vocal-1', 'Vocal-2', 'Vocal-3', 'Vocal-4',
  'Laptop', 'Track',
  'Mon', 'Monitor',
  'Main', 'Mains', 'Sub', 'Fill', 'Delay', 'FX', 'Reverb'
];

export type ChannelConfig = 'Multi' | 'Mono Out' | 'Stereo Out' | 'Mono In' | 'Stereo In' | 'Mono Thru' | 'Stereo Thru';

export const CHANNEL_CONFIGS: ChannelConfig[] = [
  'Multi',
  'Mono Out',
  'Stereo Out',
  'Mono In',
  'Stereo In',
  'Mono Thru',
  'Stereo Thru',
];

export const DEVICE_TYPE_DEFAULTS: Record<string, ChannelConfig> = {
  'Microphone':            'Mono Out',
  'DI Box':                'Mono Thru',
  'Instrument':            'Stereo Out',
  'Amplifier':             'Mono Thru',
  'Stagebox':              'Multi',
  'Snake':                 'Multi',
  'Mixer':                 'Multi',
  'Speaker':               'Mono In',
  'Wireless Receiver':     'Stereo In',
  'Wireless Transmitter':  'Stereo Out',
  'Other':                 'Multi',
};

export const CHANNEL_CONFIG_TEMPLATES: Record<ChannelConfig, {
  inputs: Array<{ connectorType: string }>;
  outputs: Array<{ connectorType: string }>;
}> = {
  'Multi':       { inputs: [], outputs: [] },
  'Mono Out':    { inputs: [], outputs: [{ connectorType: 'XLR' }] },
  'Stereo Out':  { inputs: [], outputs: [{ connectorType: '1/4"' }, { connectorType: '1/4"' }] },
  'Mono In':     { inputs: [{ connectorType: 'XLR' }], outputs: [] },
  'Stereo In':   { inputs: [{ connectorType: 'XLR' }, { connectorType: 'XLR' }], outputs: [] },
  'Mono Thru':   { inputs: [{ connectorType: '1/4"' }], outputs: [{ connectorType: 'XLR' }] },
  'Stereo Thru': { inputs: [{ connectorType: '1/4"' }, { connectorType: '1/4"' }], outputs: [{ connectorType: 'XLR' }, { connectorType: 'XLR' }] },
};

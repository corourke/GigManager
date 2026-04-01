export const DEVICE_TYPES = [
  'Microphone',
  'DI Box',
  'Stagebox',
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
  'Beta 91',
  'Beta 58',
  'Beta 57',
  'e904',
  'e906',
  'e609',
  'D6',
  'i5',
  'MD421',
  'MD441',
  'C414',
  'AT2020',
  'Other'
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
  'Amplifier':             'Mono In',
  'Stagebox':              'Multi',
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

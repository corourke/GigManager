/**
 * Seed values for autocomplete fields
 * These values appear first in suggestions, before database values
 * Edit this file to add/remove seed values
 */

export const AUTCOMPLETE_SEEDS = {
  // Asset fields
  asset: {
    category: [
      'PA',
      'Audio',
      'Lighting'
      'Video',
      'Staging',
      'Power',
      'Rigging',
      'Network',
      'Instruments',
      'Cases',
      'Other',
    ],
    sub_category: [
        'Amplifier',
        'Mixer',
        'Processor',
        'Switch',
        'Access Point',
        'Speaker',
        'Microphone',
        'Stand',
        'Wireless',
        'Truss',
        'Cable',
        'Other',
    ], 
    type: [
        'Powered Speaker',
        'Passive Speaker',
        'Monitor Speaker',
        'Powered Subwoofer',
        'Line-Array Speaker',
        'Speaker Stand',
        'Speaker Pole',
        'Mixing Console',
        'Rack Mixer',
        'Touchscreen',
        'Power Conditioner',
        'Power Supply',
        'Power Strip',
        'Power Distribution Unit',
        'Network Switch',
        'Network Hub',
        'WiFi Access Point',
        'DMX Controller',
        'DMX Wireless Transmitter',
        'DMX Wireless Receiver',
        'Microphone',
        'Dynamic Microphone',
        'Condenser Microphone',,
        'XLR Cable',
        'DMX Cable',
        'Ethernet Cable',
        'USB Cable',
        'HDMI Cable',
    ], 
    vendor: [], // No seed values, only from database
  },
  
  // Kit fields
  kit: {
    category: [
      'Audio',
      'Lighting',
      'Video',
      'Staging',
      'Power',
      'Rigging',
      'Networking',
      'Communications',
      'Instruments',
      'Cables',
      'Other',
    ],
  },
} as const;

/**
 * Get seed values for a specific field
 */
export function getSeedValues(
  formType: 'asset' | 'kit',
  field: string
): string[] {
  return AUTCOMPLETE_SEEDS[formType]?.[field as keyof typeof AUTCOMPLETE_SEEDS[typeof formType]] || [];
}


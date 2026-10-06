/**
 * Seed values for autocomplete fields
 * These values appear first in suggestions, before database values
 * Edit this file to add/remove seed values
 */

export const AUTCOMPLETE_SEEDS = {
  // Asset fields. Categories come from the organization's equipment
  // categories, and types only from the types already used in a category
  // (10-06), so there are no seeds for them.
  asset: {
    category: [],
    type: [],
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
      'Comms',
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
): readonly string[] {
  return AUTCOMPLETE_SEEDS[formType]?.[field as keyof typeof AUTCOMPLETE_SEEDS[typeof formType]] || [];
}


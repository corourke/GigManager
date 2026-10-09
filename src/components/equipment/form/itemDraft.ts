/** An item to pick from (#183). */
export interface ItemOption {
  id: string;
  manufacturer_model: string;
  category: string;
  type?: string | null;
  insurance_class?: string | null;
  description?: string | null;
}

/** What it is: an item we already have, or a new one with its own fields. */
export interface ItemDraft {
  mode: 'existing' | 'new';
  existing: ItemOption | null;
  manufacturer_model: string;
  category: string;
  type: string;
  insurance_class: string;
  description: string;
}

export const emptyItemDraft = (over: Partial<ItemDraft> = {}): ItemDraft => ({
  mode: 'new', existing: null, manufacturer_model: '', category: '', type: '', insurance_class: '', description: '', ...over,
});

/** A draft's model and category, whichever kind it is. */
export const draftModel = (d: ItemDraft) => (d.mode === 'existing' ? d.existing?.manufacturer_model ?? '' : d.manufacturer_model);
export const draftCategory = (d: ItemDraft) => (d.mode === 'existing' ? d.existing?.category ?? '' : d.category);

/** Why a draft can't be saved yet, by field. */
export function itemDraftErrors(d: ItemDraft): { item?: string; manufacturer_model?: string; category?: string } {
  if (d.mode === 'existing') return d.existing ? {} : { item: 'Choose an item, or enter a new one' };
  return {
    ...(d.manufacturer_model.trim() ? {} : { manufacturer_model: 'Manufacturer and model is required' }),
    ...(d.category.trim() ? {} : { category: 'Category is required' }),
  };
}

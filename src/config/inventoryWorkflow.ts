export interface ScanningMode {
  id: string;
  label: string;
  resultingStatus: string;
  description: string;
  locationLabel: string;
}

export const SCANNING_MODES: ScanningMode[] = [
  {
    id: 'pack-out',
    label: 'Pack-Out',
    resultingStatus: 'Checked Out',
    description: 'Pulling items from warehouse for a gig',
    locationLabel: 'Staging Area',
  },
  {
    id: 'load-truck',
    label: 'Load Truck',
    resultingStatus: 'In Transit',
    description: 'Loading scanned items onto transport',
    locationLabel: 'Truck',
  },
  {
    id: 'load-in',
    label: 'Load-In',
    resultingStatus: 'On Site',
    description: 'Confirming arrival at venue',
    locationLabel: 'Venue Area',
  },
  {
    id: 'load-out',
    label: 'Load-Out',
    resultingStatus: 'In Transit',
    description: 'Packing up from venue',
    locationLabel: 'Truck',
  },
  {
    id: 'unload',
    label: 'Unload',
    resultingStatus: 'In Warehouse',
    description: 'Returning items to warehouse',
    locationLabel: 'Warehouse',
  },
];

/**
 * The terminal status meaning an item has been returned and is no longer
 * actively checked out to whichever gig last scanned it — an item's
 * "Active Gig" should read as none once its latest tracking record reaches
 * this status, even though the record itself still points at that gig
 * (inventory_tracking rows are always gig-scoped; there's no "no gig" row).
 */
export const RETURNED_STATUS = SCANNING_MODES.find((m) => m.id === 'unload')!.resultingStatus;

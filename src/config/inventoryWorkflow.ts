export interface ScanningMode {
  id: string;
  label: string;
  resultingStatus: string;
  description: string;
}

export const SCANNING_MODES: ScanningMode[] = [
  {
    id: 'pack-out',
    label: 'Pack-Out',
    resultingStatus: 'Checked Out',
    description: 'Pulling items from warehouse for a gig',
  },
  {
    id: 'load-truck',
    label: 'Load Truck',
    resultingStatus: 'In Transit',
    description: 'Loading scanned items onto transport',
  },
  {
    id: 'load-in',
    label: 'Load-In',
    resultingStatus: 'On Site',
    description: 'Confirming arrival at venue',
  },
  {
    id: 'load-out',
    label: 'Load-Out',
    resultingStatus: 'In Transit',
    description: 'Packing up from venue',
  },
  {
    id: 'unload',
    label: 'Unload',
    resultingStatus: 'In Warehouse',
    description: 'Returning items to warehouse',
  },
];

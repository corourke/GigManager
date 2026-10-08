// Shared pieces for the #162 mockups. Class strings follow the app's components
// (AppHeader, NavigationMenu, layout/PageHeader, PageTabs, ui/badge, ui/card,
// SmartDataTable) as drawn in docs/design/component-sheet/index.html.

// Lucide icon paths (same shapes as lucide-react).
const ICONS = {
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/>',
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  banknote: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  package: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  'arrow-left': '<path d="m12 19-7-7 7-7M19 12H5"/>',
  'arrow-right': '<path d="M5 12h14M12 5l7 7-7 7"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  pencil: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  'more-v': '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
  'more-h': '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  plus: '<path d="M5 12h14M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  'scan-line': '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  receipt: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11"/>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  circle: '<circle cx="12" cy="12" r="10"/>',
  alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
  'alert-triangle': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  list: '<path d="M3 12h.01M3 18h.01M3 6h.01M8 12h13M8 18h13M8 6h13"/>',
  barcode: '<path d="M3 5v14M8 5v14M12 5v14M17 5v14M21 5v14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.41l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65M22 12.65l-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  archive: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  'map-pin': '<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  'chevron-down': '<path d="m6 9 6 6 6-6"/>',
  'chevron-right': '<path d="m9 18 6-6-6-6"/>',
  'chevron-up': '<path d="m18 15-6-6-6 6"/>',
  'chevrons-up-down': '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18H9M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  file: '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4M8 13h2M14 13h2M8 17h2M14 17h2"/>',
  sparkles: '<path d="M9.94 14.06 4 20M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  trash: '<path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  grip: '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
  split: '<path d="M16 3h5v5M8 3H3v5M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3M21 3l-7.83 7.83"/>',
  'move': '<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5M12 7v5l4 2"/>',
  'shield': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  keyboard: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10"/>',
  zap: '<path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>',
  'git-merge': '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M6 21V9a9 9 0 0 0 9 9"/>',
  smartphone: '<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>',
};

export const icon = (name, cls = 'h-4 w-4') => {
  if (!ICONS[name]) throw new Error(`unknown icon ${name}`);
  return `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name]}</svg>`;
};

// ---------- badges (ui/badge + the *_CONFIG maps) ----------
const BADGE = 'inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium';
const ASSET_STATUS = {
  Active: 'bg-green-100 text-green-800 border-green-300',
  Inactive: 'bg-amber-100 text-amber-800 border-amber-300',
  Maintenance: 'bg-red-100 text-red-700 border-red-300',
  Disposed: 'bg-blue-100 text-blue-800 border-blue-300',
  Returned: 'bg-gray-100 text-gray-700 border-gray-300',
};
const TRACKING = {
  'Checked Out': 'bg-sky-50 text-sky-700 border-sky-200',
  'In Transit': 'bg-amber-50 text-amber-700 border-amber-200',
  'On Site': 'bg-violet-50 text-violet-700 border-violet-200',
  'In Warehouse': 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const GIG_STATUS = {
  Booked: 'bg-green-100 text-green-800 border-green-300',
  Proposed: 'bg-blue-100 text-blue-800 border-blue-300',
  'Date Hold': 'bg-gray-100 text-gray-800 border-gray-300',
};
export const status = (s) => `<span class="${BADGE} ${ASSET_STATUS[s]}">${s}</span>`;
export const tracking = (s) => `<span class="${BADGE} ${TRACKING[s]}">${s}</span>`;
export const gigStatus = (s) => `<span class="${BADGE} ${GIG_STATUS[s]}">${s}</span>`;
export const tagBadge = (s) => `<span class="${BADGE} bg-secondary text-secondary-foreground border-transparent">${s}</span>`;
export const badge = (s, cls) => `<span class="${BADGE} ${cls}">${s}</span>`;

// New in this design: how a unit, a lot and an item read at a glance.
// Unit = tag icon + tag code (or serial); lot = layers icon + "Lot of N".
export const unitChip = (tag, serial) => `<span class="mr-2 inline-flex items-center">${unitChipInner(tag, serial)}</span>`;
const unitChipInner = (tag, serial) => tag
  ? `<span class="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] text-gray-900">${icon('tag', 'h-3.5 w-3.5 text-sky-700')}${tag}</span>` +
    (serial ? `<span class="ml-2 whitespace-nowrap font-mono text-[12px] text-muted-foreground">SN ${serial}</span>` : '')
  // serial number only, no inventory tag
  : `<span class="inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-[12.5px] text-gray-900">${icon('hash', 'h-3.5 w-3.5 text-sky-700')}SN ${serial}</span>`;
export const lotChip = (n, label = '') =>
  `<span class="inline-flex items-center gap-1.5 text-[13px] font-medium text-amber-900">${icon('layers', 'h-3.5 w-3.5 text-amber-700')}Lot of ${n}</span>${label ? `<span class="ml-2 text-xs text-muted-foreground">${label}</span>` : ''}`;
export const kindPill = (kind) => ({
  unit: `<span class="${BADGE} bg-sky-50 text-sky-800 border-sky-200">${icon('tag', 'h-3 w-3')}Unit</span>`,
  lot: `<span class="${BADGE} bg-amber-50 text-amber-800 border-amber-200">${icon('layers', 'h-3 w-3')}Lot</span>`,
  item: `<span class="${BADGE} bg-white text-gray-700 border-gray-300">${icon('box', 'h-3 w-3')}Item</span>`,
  kit: `<span class="${BADGE} bg-indigo-50 text-indigo-800 border-indigo-200">${icon('package', 'h-3 w-3')}Kit</span>`,
}[kind]);

// ---------- buttons ----------
const BTN = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium';
export const btnPrimary = (label, ic, extra = '') => `<button class="${BTN} h-9 px-4 bg-sky-700 hover:bg-sky-800 text-white ${extra}">${ic ? icon(ic) : ''}${label}</button>`;
export const btnOutline = (label, ic, extra = '') => `<button class="${BTN} h-9 px-4 border bg-background hover:bg-accent text-gray-900 ${extra}">${ic ? icon(ic) : ''}${label}</button>`;
export const btnGhostSm = (label, ic) => `<button class="${BTN} h-7 px-2 text-xs text-muted-foreground hover:bg-accent">${ic ? icon(ic, 'h-3.5 w-3.5') : ''}${label}</button>`;
export const btnIcon = (ic, label) => `<button aria-label="${label}" class="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-background hover:bg-accent text-gray-700">${icon(ic)}</button>`;
export const rowMenu = () => `<button aria-label="Row actions" class="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent">${icon('more-h')}</button>`;

// ---------- form controls ----------
export const label = (t, extra = '') => `<label class="text-sm font-medium text-gray-900 ${extra}">${t}</label>`;
export const meta = (t, extra = '') => `<div class="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground ${extra}">${t}</div>`;
export const input = (val, { placeholder = '', mono = false, disabled = false, extra = '', icon: ic = null } = {}) =>
  `<div class="relative flex h-9 w-full items-center rounded-md border border-transparent ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-input-background'} px-3 text-sm ${mono ? 'font-mono' : ''} ${extra}">${ic ? icon(ic, 'h-4 w-4 mr-2 text-muted-foreground') : ''}${val ? `<span class="truncate">${val}</span>` : `<span class="text-muted-foreground truncate">${placeholder}</span>`}</div>`;
export const select = (val, { placeholder = '', disabled = false, extra = '' } = {}) =>
  `<div class="flex h-9 w-full items-center justify-between rounded-md border border-transparent ${disabled ? 'bg-gray-100 text-gray-500' : 'bg-input-background'} px-3 text-sm ${extra}">${val ? `<span class="truncate">${val}</span>` : `<span class="text-muted-foreground">${placeholder}</span>`}${icon('chevron-down', 'h-4 w-4 opacity-50')}</div>`;
export const field = (lbl, control, help = '') => `<div class="space-y-1.5">${label(lbl)}${control}${help ? `<p class="text-xs text-muted-foreground">${help}</p>` : ''}</div>`;
export const checkbox = (on, text, extra = '') => `<span class="inline-flex items-center gap-2 text-sm ${extra}"><span class="flex h-4 w-4 items-center justify-center rounded-[4px] border ${on ? 'bg-sky-700 border-sky-700 text-white' : 'bg-white border-gray-400'}">${on ? icon('check', 'h-3 w-3') : ''}</span>${text}</span>`;
export const radio = (on, text, sub = '') => `<div class="flex items-start gap-2.5"><span class="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full border ${on ? 'border-sky-700' : 'border-gray-400'} bg-white">${on ? '<span class="h-2 w-2 rounded-full bg-sky-700"></span>' : ''}</span><div><div class="text-sm font-medium text-gray-900">${text}</div>${sub ? `<div class="text-xs text-muted-foreground">${sub}</div>` : ''}</div></div>`;
// boxed ui/tabs TabsList: in-content toggles only
export const toggle = (opts, active) => `<div class="inline-flex h-9 items-center rounded-lg bg-muted p-[3px] text-sm">${opts.map((o) => `<span class="inline-flex h-full items-center gap-1.5 rounded-md px-3 ${o === active ? 'bg-white font-medium text-gray-900 shadow-sm' : 'text-muted-foreground'}">${o}</span>`).join('')}</div>`;

// ---------- layout ----------
export const topbar = (section = 'Equipment') => {
  const items = [['Dashboard', 'dashboard'], ['Gigs', 'calendar'], ['Financials', 'banknote'], ['Team', 'users'], ['Equipment', 'package']];
  return `<div class="bg-background border-b border-border"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8"><div class="flex h-14 items-center gap-4 lg:gap-7">
    <div class="flex min-w-0 flex-none items-center gap-2.5"><div class="inline-flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-primary">${icon('building', 'h-[18px] w-[18px] text-primary-foreground')}</div><h2 class="max-w-[14rem] truncate text-[15px] font-semibold text-foreground">Demo Sound &amp; Lighting</h2>${badge('Admin', 'bg-purple-100 text-purple-700 border-purple-300')}</div>
    <div class="flex min-w-0 flex-1 justify-center"><nav aria-label="Sections" class="flex items-center gap-0.5 rounded-[10px] border border-gray-200 bg-gray-100 p-[3px]">
      ${items.map(([n, i]) => n === section
        ? `<span aria-current="page" class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm bg-white font-semibold text-sky-700 shadow-sm ring-1 ring-black/5">${icon(i)}<span>${n}</span></span>`
        : `<span class="flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-gray-700">${icon(i)}<span>${n}</span></span>`).join('')}
    </nav></div>
    <div class="flex flex-none items-center gap-3"><span class="h-9 w-9 flex items-center justify-center text-gray-700">${icon('bell', 'h-5 w-5')}</span><span class="w-9 h-9 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center">CO</span></div>
  </div></div></div>`;
};

export const pageHeader = ({ title, slotIcon = null, slotClass = 'bg-sky-50 text-sky-700', back = null, badge: b = '', meta: m = '', actions = '', tabs = '' }) => {
  const slot = back
    ? `<span aria-label="${back}" title="${back}" class="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-300 bg-white text-sky-700">${icon('arrow-left', 'h-[18px] w-[18px]')}</span>`
    : `<span class="flex h-8 w-8 items-center justify-center rounded-lg ${slotClass}">${icon(slotIcon, 'h-[18px] w-[18px]')}</span>`;
  return `<div class="bg-white border-b border-gray-200"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex min-h-16 items-center gap-3 py-3">
      <div class="flex h-8 w-8 flex-none items-center justify-center">${slot}</div>
      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1"><h1 class="truncate text-[22px] font-bold leading-7 text-gray-900">${title}</h1>${b}${m ? `<div class="text-sm text-gray-600">${m}</div>` : ''}</div>
      <div class="flex flex-none flex-wrap items-center justify-end gap-2">${actions}</div>
    </div>${tabs}
  </div></div>`;
};

export const pageTabs = (tabs, active) => `<div class="-mt-1 overflow-x-auto pl-11"><div role="tablist" class="flex h-10 items-stretch gap-6">${tabs.map(([n, i]) => n === active
  ? `<span role="tab" class="inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-0.5 text-sm border-sky-700 font-semibold text-sky-700">${i ? icon(i, 'size-4') : ''}${n}</span>`
  : `<span role="tab" class="inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-0.5 text-sm font-medium text-gray-700">${i ? icon(i, 'size-4') : ''}${n}</span>`).join('')}</div></div>`;

// EquipmentHeader.tsx: five tabs. "Assets" becomes "Items" in this design (open question).
export const EQUIP_TABS = [['Items'], ['Kits'], ['Out on gigs'], ['Locations'], ['Maintenance']];
export const equipmentHeader = (active, actions = '') => pageHeader({ title: 'Equipment', slotIcon: 'package', slotClass: 'bg-violet-50 text-violet-700', actions, tabs: pageTabs(EQUIP_TABS, active) });

export const content = (inner, extra = '') => `<div class="bg-gray-50"><div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 ${extra}">${inner}</div></div>`;

export const card = (title, body, { summary = '', actions = '', extra = '' } = {}) =>
  `<section class="bg-card text-card-foreground flex flex-col rounded-xl border p-4 gap-2.5 ${extra}">${title !== null ? `<div class="flex items-center gap-2"><h2 class="text-[15px] font-semibold">${title}</h2>${summary ? `<span class="text-xs text-muted-foreground">${summary}</span>` : ''}<div class="ml-auto flex items-center gap-1">${actions}</div></div>` : ''}${body}</section>`;

// SmartDataTable-style table. cols: [{h, cls}], rows: array of html strings (already <tr>)
export const TH = 'px-3 py-2.5 text-xs font-semibold text-foreground text-left whitespace-nowrap';
export const thead = (cols) => `<thead><tr class="border-b bg-muted/30 text-left">${cols.map((c) => `<th class="${TH} ${c.cls || ''}">${c.h}</th>`).join('')}</tr></thead>`;

// Callouts marking what is new in the mockup (not app chrome).
export const newMark = (n) => `<span class="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-600 px-1.5 text-[11px] font-bold text-white ring-2 ring-white shadow" title="See note ${n}">${n}</span>`;

export const alertBox = (kind, title, body) => {
  const k = {
    warn: ['border-amber-300 bg-amber-50 text-amber-900', 'alert-triangle', 'text-amber-600'],
    error: ['border-red-300 bg-red-50 text-red-900', 'alert', 'text-red-600'],
    info: ['border-sky-200 bg-sky-50 text-sky-900', 'info', 'text-sky-700'],
    ok: ['border-green-300 bg-green-50 text-green-900', 'check-circle', 'text-green-700'],
  }[kind];
  return `<div class="flex gap-3 rounded-lg border px-4 py-3 ${k[0]}">${icon(k[1], `h-4 w-4 mt-0.5 ${k[2]}`)}<div class="text-sm"><div class="font-semibold">${title}</div>${body ? `<div class="mt-0.5">${body}</div>` : ''}</div></div>`;
};

// A dialog drawn over a dimmed page (ui/dialog: max-w-lg rounded-lg border p-6 shadow-lg).
export const dialog = (title, desc, body, footer, width = 'max-w-2xl') =>
  `<div class="w-full ${width} rounded-lg border bg-background p-6 shadow-lg"><div class="flex items-start justify-between gap-4"><div><h2 class="text-lg font-semibold leading-none">${title}</h2>${desc ? `<p class="mt-2 text-sm text-muted-foreground">${desc}</p>` : ''}</div><span class="text-muted-foreground">${icon('x')}</span></div><div class="mt-5">${body}</div>${footer ? `<div class="mt-6 flex justify-end gap-2">${footer}</div>` : ''}</div>`;

export const phone = (inner, caption = '') => `<figure class="flex flex-col items-center gap-2"><div class="w-[340px] h-[700px] rounded-[38px] border-[10px] border-gray-900 bg-gray-900 shadow-xl overflow-hidden"><div class="h-full w-full overflow-hidden rounded-[28px] bg-gray-50 flex flex-col">${inner}</div></div>${caption ? `<figcaption class="text-xs text-gray-600 max-w-[320px] text-center">${caption}</figcaption>` : ''}</figure>`;

// Page shell: mockup banner, the app frame(s), and the notes.
export const PAGES = [
  ['01-equipment-list', 'Equipment list'],
  ['02-item-page', 'Item page'],
  ['03-unit-lot-form', 'Unit / lot form'],
  ['04-purchase-review', 'Purchase review'],
  ['05-kit-editor', 'Kit editor'],
  ['06-packing-list', 'Packing list and gig equipment'],
  ['07-scanning-pull', 'Scanning / pull'],
  ['08-locations-override', 'Locations and tracking override'],
  ['09-maintenance', 'Maintenance'],
  ['10-dashboard-overlap', 'Dashboard totals and overlap warning'],
  ['11-csv-import', 'CSV import'],
];

export const frame = (inner, caption = '') => `${caption ? `<p class="mb-1.5 text-xs font-medium text-gray-600">${caption}</p>` : ''}<div class="rounded-xl border border-gray-300 overflow-hidden bg-gray-50 shadow-sm">${inner}</div>`;

export const shell = ({ id, body, notes }) => {
  const i = PAGES.findIndex(([p]) => p === id);
  const [, name] = PAGES[i];
  const prev = PAGES[i - 1], next = PAGES[i + 1];
  return {
    title: `${i + 1}. ${name} · Equipment units mockups`,
    html: `<header class="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-gray-900 px-4 py-2.5 text-sm text-white">
  <span class="rounded bg-fuchsia-600 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">Mockup</span>
  <span class="font-semibold">#162 Equipment items and units</span>
  <span class="text-gray-300">Screen ${i + 1} of ${PAGES.length}: ${name}</span>
  <nav class="ml-auto flex gap-4 text-gray-300"><a class="hover:text-white" href="index.html">All screens</a>${prev ? `<a class="hover:text-white" href="${prev[0]}.html">← ${prev[1]}</a>` : ''}${next ? `<a class="hover:text-white" href="${next[0]}.html">${next[1]} →</a>` : ''}</nav>
</header>
<main class="space-y-6">${body}</main>
<section class="mt-6 rounded-xl border-2 border-dashed border-fuchsia-300 bg-white p-5">
  <h2 class="text-base font-bold text-gray-900">What changes and why</h2>
  <div class="mt-3 grid gap-x-8 gap-y-3 text-sm text-gray-800 md:grid-cols-2">${notes.map((n, k) => `<div class="flex gap-2.5">${newMark(k + 1)}<div class="leading-relaxed">${n}</div></div>`).join('')}</div>
</section>`,
  };
};

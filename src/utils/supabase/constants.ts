import {
  Building2,
  Music,
  Lightbulb,
  Warehouse,
  MapPin,
  Volume2,
  Crown,
  Shield,
  User as UserIcon,
  Clock,
} from 'lucide-react';

export const ORG_TYPE_CONFIG = {
  Production: { label: 'Production Company', icon: Building2, color: 'bg-purple-100 text-purple-700' },
  Sound: { label: 'Sound Company', icon: Volume2, color: 'bg-blue-100 text-blue-700' },
  Lighting: { label: 'Lighting Company', icon: Lightbulb, color: 'bg-yellow-100 text-yellow-700' },
  Staging: { label: 'Staging Company', icon: Warehouse, color: 'bg-indigo-100 text-indigo-700' },
  Rentals: { label: 'Rental Company', icon: Warehouse, color: 'bg-orange-100 text-orange-700' },
  Venue: { label: 'Venue', icon: MapPin, color: 'bg-green-100 text-green-700' },
  Act: { label: 'Act', icon: Music, color: 'bg-red-100 text-red-700' },
  Agency: { label: 'Agency', icon: Building2, color: 'bg-indigo-100 text-indigo-700' },
} as const;

export type OrganizationType = keyof typeof ORG_TYPE_CONFIG;

export const USER_ROLE_CONFIG = {
  Admin: { label: 'Admin', icon: Crown, color: 'bg-purple-100 text-purple-700' },
  Manager: { label: 'Manager', icon: Shield, color: 'bg-blue-100 text-blue-700' },
  Staff: { label: 'Staff', icon: UserIcon, color: 'bg-gray-100 text-gray-700' },
  Viewer: { label: 'Viewer', icon: Clock, color: 'bg-gray-50 text-gray-600' },
} as const;

export type UserRole = keyof typeof USER_ROLE_CONFIG;

export const GIG_STATUS_CONFIG = {
  DateHold: { label: 'Date Hold', color: 'bg-gray-100 text-gray-800 border-gray-300' },
  Proposed: { label: 'Proposed', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  Booked: { label: 'Booked', color: 'bg-green-100 text-green-800 border-green-300' },
  Completed: { label: 'Completed', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  Cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800 border-red-300' },
  Settled: { label: 'Settled', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
} as const;

export type GigStatus = keyof typeof GIG_STATUS_CONFIG;

export const FIN_TYPE_CONFIG = {
  'Bid Submitted': { label: 'Bid Submitted' },
  'Bid Accepted': { label: 'Bid Accepted' },
  'Bid Rejected': { label: 'Bid Rejected' },
  'Contract Submitted': { label: 'Contract Submitted' },
  'Contract Revised': { label: 'Contract Revised' },
  'Contract Signed': { label: 'Contract Signed' },
  'Contract Rejected': { label: 'Contract Rejected' },
  'Contract Cancelled': { label: 'Contract Cancelled' },
  'Contract Settled': { label: 'Contract Settled' },
  'Sub-Contract Submitted': { label: 'Sub-Contract Submitted' },
  'Sub-Contract Revised': { label: 'Sub-Contract Revised' },
  'Sub-Contract Signed': { label: 'Sub-Contract Signed' },
  'Sub-Contract Rejected': { label: 'Sub-Contract Rejected' },
  'Sub-Contract Cancelled': { label: 'Sub-Contract Cancelled' },
  'Sub-Contract Settled': { label: 'Sub-Contract Settled' },
  'Deposit Received': { label: 'Deposit Received' },
  'Deposit Sent': { label: 'Deposit Sent' },
  'Deposit Refunded': { label: 'Deposit Refunded' },
  'Payment Sent': { label: 'Payment Sent' },
  'Payment Received': { label: 'Payment Received' },
  'Expense Incurred': { label: 'Expense Incurred' },
  'Expense Reimbursed': { label: 'Expense Reimbursed' },
  'Invoice Issued': { label: 'Invoice Issued' },
  'Invoice Settled': { label: 'Invoice Settled' },
} as const;

export type FinType = keyof typeof FIN_TYPE_CONFIG;

export const FIN_CATEGORY_CONFIG = {
  'Labor': { label: 'Labor' },
  'Equipment': { label: 'Equipment' },
  'Transportation': { label: 'Transportation' },
  'Venue': { label: 'Venue' },
  'Production': { label: 'Production' },
  'Insurance': { label: 'Insurance' },
  'Rebillable': { label: 'Rebillable' },
  'Other': { label: 'Other' },
} as const;

export type FinCategory = keyof typeof FIN_CATEGORY_CONFIG;

export function getOrgTypeIcon(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].icon;
}

export function getOrgTypeColor(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].color;
}

export function getOrgTypeLabel(type: OrganizationType) {
  return ORG_TYPE_CONFIG[type].label;
}

// Comprehensive timezone list using IANA timezone identifiers
export const TIMEZONES = (() => {
  try {
    // Get all supported timezones from Intl API
    return Intl.supportedValuesOf('timeZone').sort();
  } catch {
    // Fallback for environments that don't support Intl.supportedValuesOf
    return [
      'Africa/Abidjan', 'Africa/Accra', 'Africa/Addis_Ababa', 'Africa/Algiers', 'Africa/Asmara',
      'Africa/Bamako', 'Africa/Bangui', 'Africa/Banjul', 'Africa/Bissau', 'Africa/Blantyre',
      'Africa/Brazzaville', 'Africa/Bujumbura', 'Africa/Cairo', 'Africa/Casablanca', 'Africa/Ceuta',
      'Africa/Conakry', 'Africa/Dakar', 'Africa/Dar_es_Salaam', 'Africa/Djibouti', 'Africa/Douala',
      'Africa/El_Aaiun', 'Africa/Freetown', 'Africa/Gaborone', 'Africa/Harare', 'Africa/Johannesburg',
      'Africa/Juba', 'Africa/Kampala', 'Africa/Khartoum', 'Africa/Kigali', 'Africa/Kinshasa',
      'Africa/Lagos', 'Africa/Libreville', 'Africa/Lome', 'Africa/Luanda', 'Africa/Lubumbashi',
      'Africa/Lusaka', 'Africa/Malabo', 'Africa/Maputo', 'Africa/Maseru', 'Africa/Mbabane',
      'Africa/Mogadishu', 'Africa/Monrovia', 'Africa/Nairobi', 'Africa/Ndjamena', 'Africa/Niamey',
      'Africa/Nouakchott', 'Africa/Ouagadougou', 'Africa/Porto-Novo', 'Africa/Sao_Tome', 'Africa/Tripoli',
      'Africa/Tunis', 'Africa/Windhoek', 'America/Adak', 'America/Anchorage', 'America/Anguilla',
      'America/Antigua', 'America/Araguaina', 'America/Argentina/Buenos_Aires', 'America/Argentina/Catamarca',
      'America/Argentina/Cordoba', 'America/Argentina/Jujuy', 'America/Argentina/La_Rioja',
      'America/Argentina/Mendoza', 'America/Argentina/Rio_Gallegos', 'America/Argentina/Salta',
      'America/Argentina/San_Juan', 'America/Argentina/San_Luis', 'America/Argentina/Tucuman',
      'America/Argentina/Ushuaia', 'America/Aruba', 'America/Asuncion', 'America/Atikokan',
      'America/Bahia', 'America/Bahia_Banderas', 'America/Barbados', 'America/Belem', 'America/Belize',
      'America/Blanc-Sablon', 'America/Boa_Vista', 'America/Bogota', 'America/Boise', 'America/Cambridge_Bay',
      'America/Campo_Grande', 'America/Cancun', 'America/Caracas', 'America/Cayenne', 'America/Cayman',
      'America/Chicago', 'America/Chihuahua', 'America/Costa_Rica', 'America/Creston', 'America/Cuiaba',
      'America/Curacao', 'America/Danmarkshavn', 'America/Dawson', 'America/Dawson_Creek', 'America/Denver',
      'America/Detroit', 'America/Dominica', 'America/Edmonton', 'America/Eirunepe', 'America/El_Salvador',
      'America/Fort_Nelson', 'America/Fortaleza', 'America/Glace_Bay', 'America/Godthab', 'America/Goose_Bay',
      'America/Grand_Turk', 'America/Grenada', 'America/Guadeloupe', 'America/Guatemala', 'America/Guayaquil',
      'America/Guyana', 'America/Halifax', 'America/Havana', 'America/Hermosillo', 'America/Indiana/Indianapolis',
      'America/Indiana/Knox', 'America/Indiana/Marengo', 'America/Indiana/Petersburg', 'America/Indiana/Tell_City',
      'America/Indiana/Vevay', 'America/Indiana/Vincennes', 'America/Indiana/Winamac', 'America/Inuvik',
      'America/Iqaluit', 'America/Jamaica', 'America/Juneau', 'America/Kentucky/Louisville',
      'America/Kentucky/Monticello', 'America/Kralendijk', 'America/La_Paz', 'America/Lima',
      'America/Los_Angeles', 'America/Lower_Princes', 'America/Maceio', 'America/Managua',
      'America/Manaus', 'America/Marigot', 'America/Martinique', 'America/Matamoros', 'America/Mazatlan',
      'America/Menominee', 'America/Merida', 'America/Metlakatla', 'America/Mexico_City', 'America/Miquelon',
      'America/Moncton', 'America/Monterrey', 'America/Montevideo', 'America/Montserrat', 'America/Nassau',
      'America/New_York', 'America/Nipigon', 'America/Nome', 'America/Noronha', 'America/North_Dakota/Beulah',
      'America/North_Dakota/Center', 'America/North_Dakota/New_Salem', 'America/Nuuk', 'America/Ojinaga',
      'America/Panama', 'America/Pangnirtung', 'America/Paramaribo', 'America/Phoenix', 'America/Port-au-Prince',
      'America/Port_of_Spain', 'America/Porto_Velho', 'America/Puerto_Rico', 'America/Punta_Arenas',
      'America/Rainy_River', 'America/Rankin_Inlet', 'America/Recife', 'America/Regina', 'America/Resolute',
      'America/Rio_Branco', 'America/Santarem', 'America/Santiago', 'America/Santo_Domingo',
      'America/Sao_Paulo', 'America/Scoresbysund', 'America/Sitka', 'America/St_Barthelemy',
      'America/St_Johns', 'America/St_Kitts', 'America/St_Lucia', 'America/St_Thomas',
      'America/St_Vincent', 'America/Swift_Current', 'America/Tegucigalpa', 'America/Thule',
      'America/Thunder_Bay', 'America/Tijuana', 'America/Toronto', 'America/Tortola', 'America/Vancouver',
      'America/Whitehorse', 'America/Winnipeg', 'America/Yakutat', 'America/Yellowknife',
      'Antarctica/Casey', 'Antarctica/Davis', 'Antarctica/DumontDUrville', 'Antarctica/Macquarie',
      'Antarctica/Mawson', 'Antarctica/McMurdo', 'Antarctica/Palmer', 'Antarctica/Rothera',
      'Antarctica/Syowa', 'Antarctica/Troll', 'Antarctica/Vostok', 'Arctic/Longyearbyen',
      'Asia/Aden', 'Asia/Almaty', 'Asia/Amman', 'Asia/Anadyr', 'Asia/Aqtau', 'Asia/Aqtobe',
      'Asia/Ashgabat', 'Asia/Atyrau', 'Asia/Baghdad', 'Asia/Bahrain', 'Asia/Baku', 'Asia/Bangkok',
      'Asia/Barnaul', 'Asia/Beirut', 'Asia/Bishkek', 'Asia/Brunei', 'Asia/Chita', 'Asia/Choibalsan',
      'Asia/Colombo', 'Asia/Damascus', 'Asia/Dhaka', 'Asia/Dili', 'Asia/Dubai', 'Asia/Dushanbe',
      'Asia/Famagusta', 'Asia/Gaza', 'Asia/Hebron', 'Asia/Ho_Chi_Minh', 'Asia/Hong_Kong',
      'Asia/Hovd', 'Asia/Irkutsk', 'Asia/Istanbul', 'Asia/Jakarta', 'Asia/Jayapura', 'Asia/Jerusalem',
      'Asia/Kabul', 'Asia/Kamchatka', 'Asia/Karachi', 'Asia/Kathmandu', 'Asia/Khandyga',
      'Asia/Kolkata', 'Asia/Krasnoyarsk', 'Asia/Kuala_Lumpur', 'Asia/Kuching', 'Asia/Kuwait',
      'Asia/Macau', 'Asia/Magadan', 'Asia/Makassar', 'Asia/Manila', 'Asia/Muscat', 'Asia/Nicosia',
      'Asia/Novokuznetsk', 'Asia/Novosibirsk', 'Asia/Omsk', 'Asia/Oral', 'Asia/Phnom_Penh',
      'Asia/Pontianak', 'Asia/Pyongyang', 'Asia/Qatar', 'Asia/Qostanay', 'Asia/Qyzylorda',
      'Asia/Riyadh', 'Asia/Sakhalin', 'Asia/Samarkand', 'Asia/Seoul', 'Asia/Shanghai',
      'Asia/Singapore', 'Asia/Srednekolymsk', 'Asia/Taipei', 'Asia/Tashkent', 'Asia/Tbilisi',
      'Asia/Tehran', 'Asia/Thimphu', 'Asia/Tokyo', 'Asia/Tomsk', 'Asia/Ulaanbaatar',
      'Asia/Urumqi', 'Asia/Ust-Nera', 'Asia/Vientiane', 'Asia/Vladivostok', 'Asia/Yakutsk',
      'Asia/Yangon', 'Asia/Yekaterinburg', 'Asia/Yerevan', 'Atlantic/Azores', 'Atlantic/Bermuda',
      'Atlantic/Canary', 'Atlantic/Cape_Verde', 'Atlantic/Faroe', 'Atlantic/Madeira', 'Atlantic/Reykjavik',
      'Atlantic/South_Georgia', 'Atlantic/St_Helena', 'Atlantic/Stanley', 'Australia/Adelaide',
      'Australia/Brisbane', 'Australia/Broken_Hill', 'Australia/Currie', 'Australia/Darwin',
      'Australia/Eucla', 'Australia/Hobart', 'Australia/Lindeman', 'Australia/Lord_Howe',
      'Australia/Melbourne', 'Australia/Perth', 'Australia/Sydney', 'Europe/Amsterdam',
      'Europe/Andorra', 'Europe/Astrakhan', 'Europe/Athens', 'Europe/Belgrade', 'Europe/Berlin',
      'Europe/Bratislava', 'Europe/Brussels', 'Europe/Bucharest', 'Europe/Budapest', 'Europe/Busingen',
      'Europe/Chisinau', 'Europe/Copenhagen', 'Europe/Dublin', 'Europe/Gibraltar', 'Europe/Guernsey',
      'Europe/Helsinki', 'Europe/Isle_of_Man', 'Europe/Istanbul', 'Europe/Jersey', 'Europe/Kaliningrad',
      'Europe/Kiev', 'Europe/Kirov', 'Europe/Lisbon', 'Europe/Ljubljana', 'Europe/London',
      'Europe/Luxembourg', 'Europe/Madrid', 'Europe/Malta', 'Europe/Mariehamn', 'Europe/Minsk',
      'Europe/Monaco', 'Europe/Moscow', 'Europe/Oslo', 'Europe/Paris', 'Europe/Podgorica',
      'Europe/Prague', 'Europe/Riga', 'Europe/Rome', 'Europe/Samara', 'Europe/San_Marino',
      'Europe/Sarajevo', 'Europe/Saratov', 'Europe/Simferopol', 'Europe/Skopje', 'Europe/Sofia',
      'Europe/Stockholm', 'Europe/Tallinn', 'Europe/Tirane', 'Europe/Ulyanovsk', 'Europe/Uzhgorod',
      'Europe/Vaduz', 'Europe/Vatican', 'Europe/Vienna', 'Europe/Vilnius', 'Europe/Volgograd',
      'Europe/Warsaw', 'Europe/Zagreb', 'Europe/Zaporozhye', 'Europe/Zurich', 'Indian/Antananarivo',
      'Indian/Chagos', 'Indian/Christmas', 'Indian/Cocos', 'Indian/Comoro', 'Indian/Kerguelen',
      'Indian/Mahe', 'Indian/Maldives', 'Indian/Mauritius', 'Indian/Mayotte', 'Indian/Reunion',
      'Pacific/Apia', 'Pacific/Auckland', 'Pacific/Bougainville', 'Pacific/Chatham', 'Pacific/Chuuk',
      'Pacific/Easter', 'Pacific/Efate', 'Pacific/Enderbury', 'Pacific/Fakaofo', 'Pacific/Fiji',
      'Pacific/Funafuti', 'Pacific/Galapagos', 'Pacific/Gambier', 'Pacific/Guadalcanal', 'Pacific/Guam',
      'Pacific/Honolulu', 'Pacific/Kiritimati', 'Pacific/Kosrae', 'Pacific/Kwajalein', 'Pacific/Majuro',
      'Pacific/Marquesas', 'Pacific/Midway', 'Pacific/Nauru', 'Pacific/Niue', 'Pacific/Norfolk',
      'Pacific/Noumea', 'Pacific/Pago_Pago', 'Pacific/Palau', 'Pacific/Pitcairn', 'Pacific/Pohnpei',
      'Pacific/Port_Moresby', 'Pacific/Rarotonga', 'Pacific/Saipan', 'Pacific/Tahiti', 'Pacific/Tarawa',
      'Pacific/Tongatapu', 'Pacific/Wake', 'Pacific/Wallis', 'UTC'
    ].sort();
  }
})();

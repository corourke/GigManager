interface EquipmentTabsProps {
  activeTab: 'assets' | 'kits';
  onNavigateToAssets: () => void;
  onNavigateToKits: () => void;
}

export default function EquipmentTabs({
  activeTab,
  onNavigateToAssets,
  onNavigateToKits,
}: EquipmentTabsProps) {
  return (
    <div className="border-b border-gray-200 mb-8">
      <nav className="-mb-px flex gap-8">
        <button
          onClick={onNavigateToAssets}
          className={`
            py-4 px-1 border-b-2 text-sm transition-colors
            ${
              activeTab === 'assets'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          Assets
        </button>
        <button
          onClick={onNavigateToKits}
          className={`
            py-4 px-1 border-b-2 text-sm transition-colors
            ${
              activeTab === 'kits'
                ? 'border-sky-500 text-sky-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }
          `}
        >
          Kits
        </button>
      </nav>
    </div>
  );
}

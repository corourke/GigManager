export function DetailLine({ label, value, secondary }: { label: string; value: string; secondary?: string }) {
  return (
    <div className="flex items-baseline justify-between py-1 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium text-gray-900">{value}</span>
        {secondary && <span className="text-xs text-gray-500 ml-2">{secondary}</span>}
      </div>
    </div>
  );
}

import { AlertCircle } from 'lucide-react';
import { Checkbox } from '../../ui/checkbox';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';

interface InsuranceSectionProps {
  idPrefix?: string;
  replacementValue: string;
  onReplacementValueChange: (value: string) => void;
  insured: boolean;
  onInsuredChange: (insured: boolean) => void;
  /** How many units the value is copied to (1 for one record or a lot). */
  count?: number;
  error?: string;
}

/** Insurance (#183): replacement value, entered once and copied to each unit, and "insured". */
export default function InsuranceSection({
  idPrefix = 'value', replacementValue, onReplacementValueChange, insured, onInsuredChange, count = 1, error,
}: InsuranceSectionProps) {
  const id = (f: string) => `${idPrefix}_${f}`;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div className="space-y-2">
        <Label htmlFor={id('replacement_value')}>Replacement Value</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <Input id={id('replacement_value')} type="number" step="0.01" min="0" placeholder="0.00"
            className={`pl-7 ${error ? 'border-red-500' : ''}`}
            value={replacementValue} onChange={(e) => onReplacementValueChange(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">{count > 1 ? `Each, copied to all ${count} units` : 'Per item'}</p>
        {error && <p className="text-sm text-red-600 flex items-center gap-1"><AlertCircle className="w-4 h-4" />{error}</p>}
      </div>
      <div className="md:col-span-2 flex items-center gap-2 pb-7">
        <Checkbox id={id('insured')} checked={insured} onCheckedChange={(c) => onInsuredChange(!!c)} />
        <Label htmlFor={id('insured')} className="text-sm font-normal cursor-pointer">
          {count > 1 ? 'These units have been added to an insurance policy.' : 'Added to an insurance policy.'}
        </Label>
      </div>
    </div>
  );
}

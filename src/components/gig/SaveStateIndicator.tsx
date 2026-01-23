import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SaveState } from '../../utils/hooks/useAutoSave';
import { cn } from '../ui/utils';

interface SaveStateIndicatorProps {
  state: SaveState;
  className?: string;
}

export default function SaveStateIndicator({ state, className }: SaveStateIndicatorProps) {
  if (state === 'idle') return null;

  return (
    <div 
      className={cn("flex items-center text-xs", className)}
      aria-live="polite"
    >
      {state === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin mr-1.5 text-sky-500" />
          <span className="text-gray-500">Saving...</span>
        </>
      )}
      {state === 'saved' && (
        <>
          <CheckCircle2 className="h-3 w-3 mr-1.5 text-green-500" />
          <span className="text-green-600 font-medium">Saved</span>
        </>
      )}
      {state === 'error' && (
        <>
          <AlertCircle className="h-3 w-3 mr-1.5 text-red-500" />
          <span className="text-red-600 font-medium">Error saving</span>
        </>
      )}
    </div>
  );
}

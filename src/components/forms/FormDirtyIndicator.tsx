import React from 'react';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface FormDirtyIndicatorProps {
  hasChanges: boolean;
  className?: string;
}

export default function FormDirtyIndicator({
  hasChanges,
  className = '',
}: FormDirtyIndicatorProps) {
  if (!hasChanges) {
    return (
      <Badge variant="outline" className={`text-green-700 border-green-200 bg-green-50 ${className}`}>
        <CheckCircle className="w-3 h-3 mr-1" />
        Saved
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={`text-orange-700 border-orange-200 bg-orange-50 ${className}`}>
      <AlertCircle className="w-3 h-3 mr-1" />
      Unsaved Changes
    </Badge>
  );
}

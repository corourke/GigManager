import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div className="flex items-center gap-3">
        <Icon className="w-8 h-8 text-grey-500" />
        <div>
          <h1 className="text-xl font-bold text--900">{title}</h1>
          <p className="text-sm text-gray-600">
            {description}
          </p>
        </div>
      </div>
      {actions && (
        <div className="flex items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}

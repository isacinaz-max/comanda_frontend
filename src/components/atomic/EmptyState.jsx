import React from 'react';
import Button from './Button';

export default function EmptyState({
  icon: Icon,
  title = 'Nada por aqui',
  description,
  action,
  className = '',
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      {Icon && (
        <div className="mb-4 p-4 rounded-full bg-slate-100">
          <Icon className="h-10 w-10 text-slate-400" strokeWidth={1.5} />
        </div>
      )}

      <h3 className="text-lg font-semibold text-slate-700 mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-slate-400 max-w-xs mb-6">
          {description}
        </p>
      )}

      {action && (
        <Button
          variant="primary"
          size="md"
          onClick={action.onClick}
          icon={action.icon}
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}

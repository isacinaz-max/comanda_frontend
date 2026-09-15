import React from 'react';

const badgeVariants = {
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
  neutral: 'bg-slate-50 text-slate-600 border-slate-200',
};

export default function Badge({ variant = 'neutral', children, className = '' }) {
  return (
    <span
      className={`
        inline-flex items-center
        px-2.5 py-0.5
        text-xs font-semibold
        rounded-full
        border
        transition-colors duration-200
        ${badgeVariants[variant] || badgeVariants.neutral}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

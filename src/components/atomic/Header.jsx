import React from 'react';
import { ArrowLeft } from 'lucide-react';

export default function Header({
  title,
  showBack = false,
  onBack,
  rightAction,
  className = '',
}) {
  return (
    <header
      className={`
        fixed top-0 left-0 right-0 z-40
        h-14
        bg-white/80 backdrop-blur-xl
        border-b border-slate-200/60
        flex items-center justify-between
        px-4
        safe-area-top
        ${className}
      `}
    >
      <div className="w-10">
        {showBack && (
          <button
            onClick={onBack}
            className="
              h-10 w-10 -ml-2
              rounded-full
              flex items-center justify-center
              text-slate-600
              hover:bg-slate-100
              active:bg-slate-200
              transition-colors duration-150
            "
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
      </div>

      <h1 className="text-base font-semibold text-slate-800 truncate px-2">
        {title}
      </h1>

      <div className="w-10 flex justify-end">
        {rightAction && (
          <button
            onClick={rightAction.onClick}
            className="
              h-10 w-10
              rounded-full
              flex items-center justify-center
              text-slate-600
              hover:bg-slate-100
              active:bg-slate-200
              transition-colors duration-150
            "
          >
            {rightAction.icon && <rightAction.icon className="h-5 w-5" />}
            {rightAction.label && (
              <span className="text-sm font-medium">{rightAction.label}</span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}

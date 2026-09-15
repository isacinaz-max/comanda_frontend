import React from 'react';

export default function CategoryChip({ category, isActive = false, onClick }) {
  return (
    <button
      onClick={() => onClick?.(category)}
      className={`
        flex-shrink-0
        inline-flex items-center
        px-4 py-2
        rounded-full
        text-sm font-medium
        transition-all duration-200 ease-out
        active:scale-95
        whitespace-nowrap
        border
        ${isActive
          ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20'
          : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }
      `}
    >
      {category.foto && (
        <img
          src={category.foto}
          alt={category.nome}
          className={`
            h-5 w-5 rounded-full object-cover mr-2
            ${isActive ? 'ring-2 ring-white/30' : ''}
          `}
        />
      )}
      {category.nome}
    </button>
  );
}

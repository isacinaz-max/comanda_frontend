import React, { useState, useEffect } from 'react';
import { Trash2, Minus, Plus } from 'lucide-react';

export default function CartItem({ item, onRemove, onUpdateQuantity }) {
  const [animateQuantity, setAnimateQuantity] = useState(false);

  useEffect(() => {
    if (animateQuantity) {
      const timer = setTimeout(() => setAnimateQuantity(false), 200);
      return () => clearTimeout(timer);
    }
  }, [animateQuantity, item.quantidade]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handleDecrease = () => {
    if (item.quantidade <= 1) {
      onRemove?.(item);
    } else {
      onUpdateQuantity?.(item, item.quantidade - 1);
      setAnimateQuantity(true);
    }
  };

  const handleIncrease = () => {
    onUpdateQuantity?.(item, item.quantidade + 1);
    setAnimateQuantity(true);
  };

  return (
    <div className="flex items-center gap-3 py-3 px-1">
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-slate-800 text-sm truncate">
          {item.nome}
        </h4>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatCurrency(item.valor_unitario)} un.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleDecrease}
          className={`
            h-8 w-8 rounded-full
            flex items-center justify-center
            transition-all duration-150
            active:scale-90
            ${item.quantidade <= 1
              ? 'bg-red-50 text-red-500 hover:bg-red-100'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }
          `}
        >
          {item.quantidade <= 1 ? (
            <Trash2 className="h-3.5 w-3.5" />
          ) : (
            <Minus className="h-3.5 w-3.5" />
          )}
        </button>

        <span
          className={`
            w-8 text-center font-semibold text-sm
            transition-transform duration-200
            ${animateQuantity ? 'scale-125 text-emerald-600' : 'scale-100 text-slate-800'}
          `}
        >
          {item.quantidade === Math.floor(item.quantidade) ? item.quantidade : item.quantidade.toFixed(2)}
        </span>

        <button
          onClick={handleIncrease}
          className="
            h-8 w-8 rounded-full
            bg-emerald-600 text-white
            flex items-center justify-center
            hover:bg-emerald-700
            transition-all duration-150
            active:scale-90
            shadow-sm
          "
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="text-right ml-2 min-w-[5rem]">
        <span className="font-bold text-sm text-slate-800">
          {formatCurrency(item.valor_total)}
        </span>
      </div>
    </div>
  );
}

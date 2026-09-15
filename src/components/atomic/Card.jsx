import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

export default function Card({ produto, onClick, className = '' }) {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div
      onClick={() => onClick?.(produto)}
      className={`
        bg-white rounded-2xl overflow-hidden
        shadow-sm hover:shadow-lg
        transition-all duration-300 ease-out
        hover:-translate-y-1
        active:scale-[0.98] active:shadow-md
        cursor-pointer
        border border-slate-100
        ${className}
      `}
    >
      <div className="relative aspect-square bg-slate-100 overflow-hidden">
        {!imgLoaded && !imgError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-full animate-pulse bg-slate-200" />
          </div>
        )}
        {imgError || !produto.foto ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-1">
            <ImageOff className="h-8 w-8" />
            <span className="text-xs">Sem imagem</span>
          </div>
        ) : (
          <img
            src={produto.foto}
            alt={produto.nome}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            className={`
              w-full h-full object-cover
              transition-opacity duration-300
              ${imgLoaded ? 'opacity-100' : 'opacity-0'}
            `}
          />
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-slate-800 text-sm leading-tight line-clamp-2 min-h-[2.5rem]">
          {produto.nome}
        </h3>
        <div className="mt-2 flex items-baseline justify-between">
          <span className="text-emerald-600 font-bold text-lg">
            {formatCurrency(produto.valor_venda)}
          </span>
          {produto.unidade && (
            <span className="text-slate-400 text-xs">
              / {produto.unidade}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';

function Skeleton({ className = '', width, height, rounded = 'rounded-lg' }) {
  const style = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`
        relative overflow-hidden
        bg-slate-200
        ${rounded}
        ${className}
      `}
      style={style}
    >
      <div
        className="
          absolute inset-0
          -translate-x-full
          animate-[shimmer_1.5s_infinite]
          bg-gradient-to-r
          from-transparent via-white/50 to-transparent
        "
      />
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 ${className}`}>
      <Skeleton className="aspect-square w-full" rounded="rounded-none" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-5 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          width={i === lines - 1 ? '60%' : '100%'}
        />
      ))}
    </div>
  );
}

export function SkeletonCircle({ size = 48, className = '' }) {
  return (
    <Skeleton
      className={className}
      width={size}
      height={size}
      rounded="rounded-full"
    />
  );
}

export default Skeleton;

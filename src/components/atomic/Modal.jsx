import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  className = '',
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const contentRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setIsAnimating(true));
      });
      document.body.style.overflow = 'hidden';
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setDragY(0);
        document.body.style.overflow = '';
      }, 300);
      return () => clearTimeout(timer);
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose?.();
    }
  };

  const handleTouchStart = (e) => {
    startYRef.current = e.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    if (dragY > 120) {
      onClose?.();
    } else {
      setDragY(0);
    }
  };

  if (!isVisible) return null;

  return createPortal(
    <div
      onClick={handleBackdropClick}
      className={`
        fixed inset-0 z-50 flex items-end justify-center
        transition-opacity duration-300
        ${isAnimating ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div
        className={`
          absolute inset-0
          bg-black/40
          backdrop-blur-sm
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
      />

      <div
        ref={contentRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`
          relative z-10
          w-full max-w-lg
          max-h-[85vh]
          bg-white
          rounded-t-3xl
          shadow-2xl
          overflow-hidden
          flex flex-col
          transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-y-0' : 'translate-y-full'}
          ${className}
        `}
        style={{
          transform: isDragging
            ? `translateY(${dragY}px)`
            : isAnimating
              ? 'translateY(0)'
              : 'translateY(100%)',
          transition: isDragging ? 'none' : undefined,
        }}
      >
        <div
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          className="flex items-center justify-between px-5 pt-4 pb-2"
        >
          <div className="flex flex-col items-center w-full">
            <div className="w-10 h-1 rounded-full bg-slate-300 mb-3" />
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-semibold text-slate-800">
                {title}
              </h2>
              <button
                onClick={onClose}
                className="
                  h-8 w-8 rounded-full
                  bg-slate-100
                  flex items-center justify-center
                  text-slate-500
                  hover:bg-slate-200 hover:text-slate-700
                  transition-colors duration-150
                "
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-6 overscroll-contain">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}

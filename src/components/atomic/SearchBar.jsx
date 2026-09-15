import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function SearchBar({
  value = '',
  onChange,
  placeholder = 'Buscar...',
  className = '',
}) {
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setLocalValue(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      onChange?.(newValue);
    }, 300);
  };

  const handleClear = () => {
    setLocalValue('');
    onChange?.('');
    inputRef.current?.focus();
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-slate-400" />
      </div>

      <input
        ref={inputRef}
        type="text"
        value={localValue}
        onChange={handleChange}
        placeholder={placeholder}
        className="
          w-full
          pl-11 pr-10 py-3
          bg-slate-50
          border border-slate-200
          rounded-xl
          text-sm text-slate-800
          placeholder:text-slate-400
          focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent
          focus:bg-white
          transition-all duration-200
        "
      />

      {localValue && (
        <button
          onClick={handleClear}
          className="
            absolute inset-y-0 right-0 pr-3.5
            flex items-center
            text-slate-400 hover:text-slate-600
            transition-colors duration-150
          "
          type="button"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CustomDropdown({ value, onChange, name, options, placeholder = "Pilih" }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full px-4 py-2.5 pr-10 rounded-xl bg-gray-50 border border-gray-200 focus:border-gray-900 focus:bg-white outline-none transition-all cursor-pointer text-left flex items-center justify-between text-sm">
        <span className={selectedOption ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>
      {isOpen && (
        <div className="absolute z-[9999] mt-1.5 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-h-60 overflow-y-auto animate-slide-down">
          {options.map((option) => (
            <button key={option.value} type="button" onClick={() => { onChange({ target: { name, value: option.value } }); setIsOpen(false); }}
              className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${value === option.value ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-600 hover:bg-gray-50'}`}>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

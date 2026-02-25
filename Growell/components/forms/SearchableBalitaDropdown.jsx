'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X, User } from 'lucide-react';

/**
 * Searchable dropdown for selecting a balita (child) from a list.
 * Displays child name with parent name subtitles.
 *
 * Props:
 *  - items: Array<{ uuid, nama, nama_ibu, tanggal_lahir, kelurahan, kecamatan, status_gizi_bbtb, status_gizi_tbu }>
 *  - selected: uuid string of currently selected balita
 *  - onSelect: (item) => void — called with the full balita item on selection
 *  - placeholder: string
 *  - disabled: boolean
 */
export default function SearchableBalitaDropdown({
  items = [],
  selected,
  onSelect,
  placeholder = 'Cari & pilih nama balita...',
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    if (isOpen) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  // Auto-focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const selectedItem = items.find((i) => i.uuid === selected);

  const filtered =
    query.trim().length === 0
      ? items
      : items.filter((i) => {
          const q = query.toLowerCase();
          return (
            (i.nama || '').toLowerCase().includes(q) ||
            (i.nama_ibu || '').toLowerCase().includes(q)
          );
        });

  const handleSelect = (item) => {
    onSelect(item);
    setIsOpen(false);
    setQuery('');
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen((o) => !o)}
        className={`w-full px-4 py-3 pr-10 rounded-xl bg-gray-50 border text-left flex items-center justify-between text-sm transition-all outline-none
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:border-gray-300'}
          ${isOpen ? 'border-gray-900 bg-white ring-2 ring-gray-900/5' : 'border-gray-200'}`}
      >
        {selectedItem ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-6 h-6 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0">
              <User size={12} className="text-teal-600" />
            </div>
            <div className="min-w-0">
              <p className="text-gray-900 font-semibold text-sm truncate">{selectedItem.nama}</p>
              {selectedItem.nama_ibu && (
                <p className="text-gray-400 text-xs truncate">Ibu: {selectedItem.nama_ibu}</p>
              )}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedItem && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => e.key === 'Enter' && handleClear(e)}
              className="p-1 rounded-md hover:bg-gray-200 transition cursor-pointer"
            >
              <X size={13} className="text-gray-400" />
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute z-[9999] mt-1.5 w-full bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden animate-slide-down">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik nama balita atau nama ibu..."
                className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-900 focus:bg-white transition-all placeholder:text-gray-400"
              />
            </div>
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-400">
                <User size={20} className="mx-auto mb-2 opacity-30" />
                Tidak ada balita yang ditemukan
              </div>
            ) : (
              filtered.map((item) => (
                <button
                  key={item.uuid}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 flex items-center gap-3
                    ${selected === item.uuid ? 'bg-teal-50/50' : ''}`}
                >
                  <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center flex-shrink-0 text-teal-600 text-xs font-bold">
                    {(item.nama || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.nama}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {item.nama_ibu && (
                        <span className="text-xs text-gray-400 truncate">Ibu: {item.nama_ibu}</span>
                      )}
                      {item.tanggal_lahir && (
                        <span className="text-xs text-gray-300">·</span>
                      )}
                      {item.tanggal_lahir && (
                        <span className="text-xs text-gray-400">
                          {new Date(item.tanggal_lahir).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      {item.kelurahan && (
                        <>
                          <span className="text-xs text-gray-300">·</span>
                          <span className="text-xs text-gray-400">{item.kelurahan}</span>
                        </>
                      )}
                    </div>
                  </div>
                  {selected === item.uuid && (
                    <div className="w-2 h-2 rounded-full bg-teal-500 flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

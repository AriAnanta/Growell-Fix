'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * CustomDatePicker â€” Google-Forms-style date picker
 *
 * Flow: Tahun (scrollable list, 1900â€“thisYear+5) â†’ Bulan â†’ Tanggal
 * Auto-scrolls to the relevant year when the picker opens.
 *
 * Props:
 *   value       â€” ISO date string "YYYY-MM-DD"
 *   onChange    â€” (e) => void  with  e.target = { name, value }
 *   name        â€” field name
 *   placeholder â€” placeholder text
 *   defaultYear â€” (optional) year to scroll to & open on when no value exists.
 *                 If provided, picker opens on Year screen.
 *                 If omitted, picker opens on Day screen (for "today"-type fields).
 *   yearMin     â€” (optional) earliest year in list, default 1900
 *   yearMax     â€” (optional) latest  year in list, default thisYear + 5
 */
export default function CustomDatePicker({ value, onChange, name, placeholder = "Pilih Tanggal", defaultYear, yearMin, yearMax }) {
  const thisYear = new Date().getFullYear();
  const YEAR_MIN = yearMin ?? 1900;
  const YEAR_MAX = yearMax ?? thisYear + 5;

  const initialMode = defaultYear ? 'year' : 'day';
  const getInitialMonth = () =>
    defaultYear && !value ? new Date(defaultYear, 0, 1) : new Date();

  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(getInitialMonth);
  const [pickerMode, setPickerMode] = useState(initialMode);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);

  const containerRef = useRef(null);
  const yearListRef = useRef(null);

  /* â”€â”€ sync when value prop changes â”€â”€ */
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  /* â”€â”€ close on outside click â”€â”€ */
  useEffect(() => {
    const h = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) handleClose();
    };
    if (isOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen, selectedDate]);

  /* â”€â”€ auto-scroll year list to the active year when year picker opens â”€â”€ */
  useEffect(() => {
    if (pickerMode === 'year' && yearListRef.current) {
      requestAnimationFrame(() => {
        const active = yearListRef.current?.querySelector('[data-active="true"]');
        if (active) active.scrollIntoView({ block: 'center', behavior: 'instant' });
      });
    }
  }, [pickerMode, isOpen]);

  /* â”€â”€ helpers â”€â”€ */
  const formatDate = (d) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const toISODate = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const handleClose = () => {
    setIsOpen(false);
    if (selectedDate) {
      setCurrentMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
    } else if (defaultYear) {
      setCurrentMonth(new Date(defaultYear, 0, 1));
    } else {
      setCurrentMonth(new Date());
    }
    setPickerMode(initialMode);
  };

  const handleDateSelect = (day) => {
    const nd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(nd);
    onChange({ target: { name, value: toISODate(nd) } });
    setIsOpen(false);
    setPickerMode(initialMode);
  };

  /* â”€â”€ build calendar days â”€â”€ */
  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = [];
  const prevDays = getDaysInMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  for (let i = firstDay - 1; i >= 0; i--) days.push({ day: prevDays - i, cur: false });
  for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, cur: true });
  const rem = 42 - days.length;
  for (let i = 1; i <= rem; i++) days.push({ day: i, cur: false });

  const monthsFull = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

  /* â”€â”€ year list: newest first, dynamic YEAR_MINâ€“YEAR_MAX â”€â”€ */
  const years = [];
  for (let y = YEAR_MAX; y >= YEAR_MIN; y--) years.push(y);

  /* â”€â”€ which year to highlight & scroll to â”€â”€ */
  const focusYear = selectedDate?.getFullYear() ?? defaultYear ?? currentMonth.getFullYear();

  return (
    <div className="relative" ref={containerRef}>

      {/* â”€â”€ Trigger â”€â”€ */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:border-gray-400 outline-none transition-all cursor-pointer flex items-center text-sm"
      >
        <CalendarIcon className="absolute left-3.5 text-gray-400 pointer-events-none" size={18} />
        <span className={selectedDate ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selectedDate ? formatDate(selectedDate) : placeholder}
        </span>
      </div>

      {/* â”€â”€ Popup â”€â”€ */}
      {isOpen && (
        <>
          {/* mobile backdrop */}
          <div className="fixed inset-0 bg-black/30 z-[9998] sm:hidden" onClick={handleClose} />

          <div className="fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-auto right-0 sm:right-auto sm:mt-1.5 sm:top-full z-[9999] bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-gray-200 w-full sm:w-[310px]">

            {/* â•â•â•â• YEAR PICKER â•â•â•â• */}
            {pickerMode === 'year' && (
              <div className="flex flex-col">
                <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Pilih Tahun</h3>
                  <button
                    onClick={() => setPickerMode('day')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    Ke Kalender »»
                  </button>
                </div>

                {/* scrollable list â€” same style as Google Forms */}
                <div
                  ref={yearListRef}
                  className="overflow-y-auto px-2 py-2"
                  style={{ maxHeight: '260px' }}
                >
                  {years.map((y) => {
                    const isActive = y === focusYear;
                    const isCurrent = y === thisYear;
                    return (
                      <button
                        key={y}
                        data-active={isActive ? 'true' : 'false'}
                        onClick={() => {
                          setCurrentMonth(new Date(y, currentMonth.getMonth(), 1));
                          setPickerMode('month');
                        }}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5 flex items-center gap-2 ${
                          isActive
                            ? 'bg-gray-900 text-white'
                            : isCurrent
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {y}
                        {isCurrent && !isActive && (
                          <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wide">
                            Tahun ini
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* â•â•â•â• MONTH PICKER â•â•â•â• */}
            {pickerMode === 'month' && (
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-900 text-sm">
                    Pilih Bulan{' '}
                    <span className="text-gray-500 font-normal">- {currentMonth.getFullYear()}</span>
                  </h3>
                  <button
                    onClick={() => setPickerMode('year')}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                  >
                    «« Ubah Tahun
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {monthsFull.map((m, idx) => {
                    const isSel =
                      selectedDate &&
                      idx === selectedDate.getMonth() &&
                      currentMonth.getFullYear() === selectedDate.getFullYear();
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setCurrentMonth(new Date(currentMonth.getFullYear(), idx, 1));
                          setPickerMode('day');
                        }}
                        className={`py-2.5 rounded-xl text-xs font-medium transition-all ${
                          isSel ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {m}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* â•â•â•â• DAY PICKER â•â•â•â• */}
            {pickerMode === 'day' && (
              <div className="p-3 sm:p-4">
                {/* nav header */}
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft size={16} className="text-gray-500" />
                  </button>

                  <button
                    onClick={() => setPickerMode('month')}
                    className="flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors group"
                  >
                    <span className="font-semibold text-gray-900 text-sm">
                      {monthsFull[currentMonth.getMonth()]}
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); setPickerMode('year'); }}
                      className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors"
                    >
                      {currentMonth.getFullYear()}
                    </span>
                    <ChevronDown size={12} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
                  </button>

                  <button
                    onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronRight size={16} className="text-gray-500" />
                  </button>
                </div>

                {/* day-of-week headers */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {dayNames.map((d, i) => (
                    <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
                  ))}
                </div>

                {/* day grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {days.map(({ day, cur }, idx) => {
                    const isSel =
                      selectedDate && cur &&
                      day === selectedDate.getDate() &&
                      currentMonth.getMonth() === selectedDate.getMonth() &&
                      currentMonth.getFullYear() === selectedDate.getFullYear();
                    const isToday =
                      cur &&
                      day === new Date().getDate() &&
                      currentMonth.getMonth() === new Date().getMonth() &&
                      currentMonth.getFullYear() === new Date().getFullYear();
                    return (
                      <button
                        key={idx}
                        onClick={() => cur && handleDateSelect(day)}
                        disabled={!cur}
                        className={[
                          'aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all',
                          !cur ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100',
                          isSel ? '!bg-gray-900 !text-white' : '',
                          isToday && !isSel ? '!bg-blue-50 !text-blue-700 font-bold' : '',
                        ].join(' ')}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>

                {/* quick actions */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => {
                      const t = new Date();
                      setSelectedDate(t);
                      onChange({ target: { name, value: toISODate(t) } });
                      handleClose();
                    }}
                    className="flex-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors text-xs"
                  >
                    Hari Ini
                  </button>
                  <button
                    onClick={() => {
                      setSelectedDate(null);
                      onChange({ target: { name, value: '' } });
                      handleClose();
                    }}
                    className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors text-xs"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}

          </div>
        </>
      )}
    </div>
  );
}

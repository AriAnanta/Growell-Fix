import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

/**
 * CustomDatePicker — with year & month dropdown selectors
 * Allows quick jump to a specific year and month, instead of clicking back arrow
 * one month at a time.
 */
export default function CustomDatePicker({ value, onChange, name, placeholder = "Pilih Tanggal" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [pickerMode, setPickerMode] = useState('day'); // 'day' | 'month' | 'year'
  const datePickerRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);

  useEffect(() => {
    if (value) {
      const d = new Date(value);
      setSelectedDate(d);
      setCurrentMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    } else {
      setSelectedDate(null);
    }
  }, [value]);

  useEffect(() => {
    function h(e) { if (datePickerRef.current && !datePickerRef.current.contains(e.target)) { setIsOpen(false); setPickerMode('day'); } }
    if (isOpen) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [isOpen]);

  const formatDate = (d) => {
    if (!d) return '';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };
  const toISODate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const getDaysInMonth = (d) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1).getDay();

  const handleDateSelect = (day) => {
    const nd = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    setSelectedDate(nd);
    onChange({ target: { name, value: toISODate(nd) } });
    setIsOpen(false);
    setPickerMode('day');
  };

  const handleMonthSelect = (monthIdx) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), monthIdx, 1));
    setPickerMode('day');
  };

  const handleYearSelect = (year) => {
    setCurrentMonth(new Date(year, currentMonth.getMonth(), 1));
    setPickerMode('month');
  };

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

  const thisYear = new Date().getFullYear();
  const years = [];
  for (let y = thisYear + 1; y >= 2018; y--) years.push(y);

  return (
    <div className="relative" ref={datePickerRef}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200 focus-within:border-gray-900 focus-within:bg-white outline-none transition-all cursor-pointer flex items-center text-sm"
      >
        <CalendarIcon className="absolute left-3.5 text-gray-400 pointer-events-none" size={18} />
        <span className={selectedDate ? 'text-gray-900 font-medium' : 'text-gray-400'}>
          {selectedDate ? formatDate(selectedDate) : placeholder}
        </span>
      </div>

      {isOpen && (<>
        <div className="fixed inset-0 bg-black/30 z-[9998] sm:hidden" onClick={() => { setIsOpen(false); setPickerMode('day'); }} />
        <div className="fixed sm:absolute bottom-0 sm:bottom-auto left-0 sm:left-auto right-0 sm:right-auto sm:mt-1.5 sm:top-full z-[9999] bg-white rounded-t-2xl sm:rounded-xl shadow-lg border border-gray-200 p-3 sm:p-4 w-full sm:w-[310px] max-h-[80vh] sm:max-h-none overflow-y-auto">

          {/* YEAR MODE */}
          {pickerMode === 'year' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Pilih Tahun</h3>
                <button onClick={() => setPickerMode('day')} className="text-xs text-gray-500 hover:text-gray-900 font-medium">Kembali</button>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {years.map(y => (
                  <button key={y} onClick={() => handleYearSelect(y)}
                    className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                      y === currentMonth.getFullYear() ? 'bg-gray-900 text-white'
                      : y === thisYear ? 'bg-gray-100 text-gray-900 font-bold hover:bg-gray-200'
                      : 'text-gray-700 hover:bg-gray-100'
                    }`}>{y}</button>
                ))}
              </div>
            </div>
          )}

          {/* MONTH MODE */}
          {pickerMode === 'month' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900 text-sm">Pilih Bulan — {currentMonth.getFullYear()}</h3>
                <button onClick={() => setPickerMode('year')} className="text-xs text-gray-500 hover:text-gray-900 font-medium">Ubah Tahun</button>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {monthsFull.map((m, idx) => (
                  <button key={idx} onClick={() => handleMonthSelect(idx)}
                    className={`py-2.5 rounded-lg text-xs font-medium transition-all ${
                      idx === currentMonth.getMonth() ? 'bg-gray-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                    }`}>{m}</button>
                ))}
              </div>
            </div>
          )}

          {/* DAY MODE */}
          {pickerMode === 'day' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronLeft size={16} className="text-gray-500" />
                </button>
                <button onClick={() => setPickerMode('month')} className="flex items-center gap-1.5 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors group">
                  <span className="font-semibold text-gray-900 text-sm">{monthsFull[currentMonth.getMonth()]}</span>
                  <span onClick={(e) => { e.stopPropagation(); setPickerMode('year'); }} className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors cursor-pointer">{currentMonth.getFullYear()}</span>
                  <ChevronDown size={12} className="text-gray-400 group-hover:text-gray-700 transition-colors" />
                </button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={16} className="text-gray-500" />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {dayNames.map((d, i) => <div key={i} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>)}
              </div>

              <div className="grid grid-cols-7 gap-0.5">
                {days.map(({ day, cur }, idx) => {
                  const isSel = selectedDate && cur && day === selectedDate.getDate() && currentMonth.getMonth() === selectedDate.getMonth() && currentMonth.getFullYear() === selectedDate.getFullYear();
                  const isToday = cur && day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();
                  return (
                    <button key={idx} onClick={() => cur && handleDateSelect(day)} disabled={!cur}
                      className={`aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                        !cur ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-100'
                      } ${isSel ? 'bg-gray-900 text-white' : ''} ${isToday && !isSel ? 'bg-gray-100 text-gray-900 font-bold' : ''}`}
                    >{day}</button>
                  );
                })}
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button onClick={() => { const t = new Date(); setSelectedDate(t); onChange({ target: { name, value: toISODate(t) } }); setIsOpen(false); }}
                  className="flex-1 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg font-medium transition-colors text-xs">Hari Ini</button>
                <button onClick={() => { setSelectedDate(null); onChange({ target: { name, value: '' } }); setIsOpen(false); }}
                  className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-medium transition-colors text-xs">Hapus</button>
              </div>
            </div>
          )}

        </div>
      </>)}
    </div>
  );
}

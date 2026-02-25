'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MoreVertical, MessageSquarePlus, Send, ArrowLeft, Loader2, CheckCircle2, User, X, Sparkles, Clock, Trash2, Pencil } from 'lucide-react';
import { apiFetch, isAuthenticated, getUserData } from '@/utils/auth';

export default function WhatsAppChatClient({ initialUuid = null }) {
  const router = useRouter();
  const [userData, setUserData] = useState(null);
  
  // Left Panel State
  const [consultations, setConsultations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isConsultationsLoading, setIsConsultationsLoading] = useState(true);
  
  // Right Panel State
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Edit / Delete message
  const [editingMsg, setEditingMsg] = useState(null); // { uuid, pesan }
  const [contextMenu, setContextMenu] = useState(null); // { msgUuid, x, y }
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  
  // Modals
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [availableAhliGizi, setAvailableAhliGizi] = useState([]);
  const [selectedAhliGiziId, setSelectedAhliGiziId] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [newChatError, setNewChatError] = useState('');
  
  // Refs
  const messagesEndRef = useRef(null);
  const pollIntervalRef = useRef(null);
  const headerMenuRef = useRef(null);
  const contextMenuRef = useRef(null);
  const inputRef = useRef(null);

  // Close context menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setShowHeaderMenu(false);
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target)) setContextMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Init
  useEffect(() => {
    if (!isAuthenticated()) { router.push('/login'); return; }
    const ud = getUserData();
    setUserData(ud);
    if (!['orang_tua', 'ahli_gizi'].includes(ud?.role)) { router.push('/'); return; }
    
    fetchConsultations(ud?.role).then((list) => {
      if (initialUuid) {
        const chat = list?.find(c => c.uuid === initialUuid);
        if (chat) handleSelectChat(chat);
      }
    });

    return () => { if (pollIntervalRef.current) clearInterval(pollIntervalRef.current); };
  }, [initialUuid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Data Fetching
  const fetchConsultations = async (role) => {
    setIsConsultationsLoading(true);
    try {
      const res = await apiFetch('/api/konsultasi');
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.data || []);
        return data.data || [];
      }
    } catch (e) { console.error(e); }
    finally { setIsConsultationsLoading(false); }
    return [];
  };

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);
    setIsChatLoading(true);
    setMessages([]); // clear old messages quickly
    
    // update URL without hard reload
    window.history.pushState({}, '', `/konsultasi/${chat.uuid}`);
    
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    await fetchChatDetail(chat.uuid);
    
    // Start polling for this chat
    pollIntervalRef.current = setInterval(() => fetchChatDetail(chat.uuid, true), 3000);
  };

  const fetchChatDetail = async (chatUuid, isSilent = false) => {
    if (!isSilent) setIsChatLoading(true);
    try {
      const res = await apiFetch(`/api/konsultasi/${chatUuid}`);
      if (res.ok) {
        const data = await res.json();
        // optionally update the selectedChat metadata if status changed
        setSelectedChat(data.konsultasi);
        // avoid jitter if user is typing or if doing silent poll
        setMessages(data.messages || []);
      }
    } catch (e) { console.error(e); }
    finally { if (!isSilent) setIsChatLoading(false); }
  };

  // Actions
  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending || !selectedChat) return;

    // EDIT MODE
    if (editingMsg) {
      setIsSending(true);
      try {
        const res = await apiFetch(`/api/konsultasi/${selectedChat.uuid}/message/${editingMsg.uuid}`, {
          method: 'PUT',
          body: JSON.stringify({ pesan: newMessage }),
        });
        if (res.ok) {
          setMessages(prev => prev.map(m =>
            m.uuid === editingMsg.uuid ? { ...m, pesan: newMessage, is_edited: true } : m
          ));
          handleCancelEdit();
        }
      } catch (e) { console.error(e); }
      finally { setIsSending(false); }
      return;
    }

    // SEND MODE
    setIsSending(true);
    try {
      const res = await apiFetch(`/api/konsultasi/${selectedChat.uuid}/message`, {
        method: 'POST',
        body: JSON.stringify({ pesan: newMessage }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [...prev, data.data]);
        setNewMessage('');
        setConsultations(prev => prev.map(c => 
          c.uuid === selectedChat.uuid 
            ? { ...c, lastMessage: newMessage, lastMessageTime: new Date() } 
            : c
        ));
      }
    } catch (e) { console.error(e); }
    finally { setIsSending(false); }
  };

  const handleEndConsultation = async () => {
    if (!confirm('Akhiri konsultasi ini?')) return;
    try {
      const res = await apiFetch(`/api/konsultasi/${selectedChat.uuid}`, {
        method: 'PUT',
        body: JSON.stringify({ status: 'selesai' }),
      });
      if (res.ok) {
        fetchChatDetail(selectedChat.uuid);
        fetchConsultations(userData.role); // refresh list
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteConsultation = async () => {
    if (!confirm('Hapus percakapan ini? Semua pesan akan hilang permanen.')) return;
    setShowHeaderMenu(false);
    try {
      const res = await apiFetch(`/api/konsultasi/${selectedChat.uuid}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedChat(null);
        setMessages([]);
        window.history.pushState({}, '', '/konsultasi');
        await fetchConsultations(userData.role);
      }
    } catch (e) { console.error(e); }
  };

  const handleDeleteFromList = async (e, consultationUuid) => {
    e.stopPropagation();
    if (!confirm('Hapus percakapan ini? Semua pesan akan hilang permanen.')) return;
    try {
      const res = await apiFetch(`/api/konsultasi/${consultationUuid}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedChat?.uuid === consultationUuid) {
          setSelectedChat(null);
          setMessages([]);
          window.history.pushState({}, '', '/konsultasi');
        }
        setConsultations(prev => prev.filter(c => c.uuid !== consultationUuid));
      }
    } catch (e) { console.error(e); }
  };

  const handleClearHistory = async () => {
    if (!confirm('Hapus semua riwayat pesan? Percakapan tetap ada tapi semua pesan dihapus.')) return;
    setShowHeaderMenu(false);
    try {
      const res = await apiFetch(`/api/konsultasi/${selectedChat.uuid}/message`, { method: 'DELETE' });
      if (res.ok) setMessages([]);
    } catch (e) { console.error(e); }
  };

  const handleStartEdit = (msg) => {
    setEditingMsg({ uuid: msg.uuid, pesan: msg.pesan });
    setNewMessage(msg.pesan);
    setContextMenu(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleCancelEdit = () => {
    setEditingMsg(null);
    setNewMessage('');
  };

  const handleDeleteMessage = async (msgUuid) => {
    setContextMenu(null);
    if (!confirm('Hapus pesan ini?')) return;
    try {
      const res = await apiFetch(`/api/konsultasi/${selectedChat.uuid}/message/${msgUuid}`, { method: 'DELETE' });
      if (res.ok) {
        setMessages(prev => prev.filter(m => m.uuid !== msgUuid));
      }
    } catch (e) { console.error(e); }
  };

  // New Chat Action
  const handleOpenNewChatModal = async () => {
    setShowNewChatModal(true);
    setNewChatError('');
    try {
      const res = await apiFetch('/api/ahli-gizi');
      if (res.ok) {
        const data = await res.json();
        setAvailableAhliGizi(data.data || []);
      }
    } catch (e) { setNewChatError('Gagal memuat daftar Ahli Gizi'); }
  };

  const handleCreateConsultation = async () => {
    if (!selectedAhliGiziId) {
      setNewChatError('Pilih Ahli Gizi terlebih dahulu');
      return;
    }

    // Prevent duplicate: if there's already an active/pending chat with this ahli gizi, open it
    const existingChat = consultations.find(
      c => Number(c.ahli_gizi_id) === Number(selectedAhliGiziId) && ['menunggu', 'aktif'].includes(c.status)
    );
    if (existingChat) {
      setShowNewChatModal(false);
      setSelectedAhliGiziId('');
      handleSelectChat(existingChat);
      return;
    }

    setIsCreatingChat(true); setNewChatError('');
    try {
      const res = await apiFetch('/api/konsultasi', {
        method: 'POST',
        body: JSON.stringify({ ahli_gizi_id: selectedAhliGiziId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Gagal membuat konsultasi');
      
      setShowNewChatModal(false);
      setSelectedAhliGiziId('');
      
      const updatedList = await fetchConsultations(userData.role);
      const newChat = updatedList.find(c => c.uuid === data.konsultasi.uuid);
      if (newChat) handleSelectChat(newChat);
      
    } catch (e) { setNewChatError(e.message); }
    finally { setIsCreatingChat(false); }
  };

  // UI Helpers
  const statusConfig = {
    menunggu: { label: 'Menunggu', bg: 'bg-amber-100 text-amber-800' },
    aktif: { label: 'Aktif', bg: 'bg-emerald-100 text-emerald-800' },
    selesai: { label: 'Selesai', bg: 'bg-blue-100 text-blue-800' },
    dibatalkan: { label: 'Dibatalkan', bg: 'bg-red-100 text-red-800' },
  };

  const filteredConsultations = consultations.filter(c => {
    const targetName = userData?.role === 'orang_tua' ? c.ahli_gizi_nama : c.orang_tua_nama;
    return (targetName || '').toLowerCase().includes(searchQuery.toLowerCase()) || c.topik.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden font-sans">
      
      {/* ─── LEFT PANEL (SIDEBAR) ─── */}
      <div className={`w-full md:w-[360px] lg:w-[400px] flex-shrink-0 bg-white border-r border-gray-200 flex flex-col relative ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Sidebar Header */}
        <div className="h-16 px-4 bg-gradient-to-r from-teal-600 to-sky-600 flex items-center justify-between border-b border-teal-700/20 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.push(userData?.role === 'orang_tua' ? '/orang-tua' : '/')} className="p-2 -mr-1 hover:bg-white/10 rounded-full transition flex-shrink-0"><ArrowLeft size={20} className="text-white/80" /></button>
            <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-bold shadow-sm flex-shrink-0">
              {userData?.nama?.charAt(0) || '?'}
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-white truncate text-sm leading-tight">{userData?.nama || 'Profil'}</h2>
              <p className="text-white/60 text-[10px] leading-tight">{userData?.role === 'orang_tua' ? 'Orang Tua' : 'Ahli Gizi'}</p>
            </div>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            {userData?.role === 'orang_tua' && (
              <button
                onClick={handleOpenNewChatModal}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-full transition text-white text-xs font-semibold border border-white/20 backdrop-blur-sm shadow-sm"
                title="Mulai Konsultasi Baru"
              >
                <MessageSquarePlus size={15} />
                <span className="hidden sm:inline">Chat Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 bg-white border-b border-gray-100">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input 
              type="text" 
              placeholder="Cari konsultasi atau topik..." 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-gray-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>

        {/* Mobile FAB for new chat — only for orang_tua */}
        {userData?.role === 'orang_tua' && !selectedChat && (
          <button
            onClick={handleOpenNewChatModal}
            className="md:hidden absolute bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-sky-600 text-white font-semibold text-sm rounded-full shadow-lg hover:shadow-xl hover:shadow-teal-200/50 hover:scale-105 transition-all"
          >
            <MessageSquarePlus size={18} />
            Chat Baru
          </button>
        )}

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {isConsultationsLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : filteredConsultations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4"><MessageSquarePlus size={28} className="text-gray-300" /></div>
              <p className="text-gray-500 font-medium">{searchQuery ? 'Tidak ada hasil' : 'Belum ada obrolan'}</p>
              {userData?.role === 'orang_tua' && !searchQuery && (
                <button onClick={handleOpenNewChatModal} className="mt-4 text-sm text-teal-600 font-semibold hover:text-teal-700">Mulai Chat Baru</button>
              )}
            </div>
          ) : (
            filteredConsultations.map((c) => {
              const sc = statusConfig[c.status] || statusConfig.menunggu;
              const targetName = userData?.role === 'orang_tua' ? c.ahli_gizi_nama : c.orang_tua_nama;
              const roleTitle = userData?.role === 'orang_tua' ? 'Ahli Gizi' : 'Orang Tua';
              const isSelected = selectedChat?.uuid === c.uuid;
              
              return (
                <div
                  key={c.uuid}
                  onClick={() => handleSelectChat(c)}
                  className={`w-full text-left flex items-start px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100 group ${isSelected ? 'bg-teal-50' : 'bg-white'}`}
                >
                  <div className="relative flex-shrink-0 mr-3 mt-1">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm ${userData?.role === 'orang_tua' ? 'bg-gradient-to-br from-indigo-500 to-cyan-500' : 'bg-gradient-to-br from-emerald-400 to-teal-600'}`}>
                      {targetName ? targetName.charAt(0).toUpperCase() : '?'}
                    </div>
                    {c.status === 'aktif' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <h3 className="font-semibold text-gray-900 truncate pr-2" title={targetName}>{targetName || 'Menunggu Penugasan'}</h3>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Delete button — visible on hover */}
                        <button
                          onClick={(e) => handleDeleteFromList(e, c.uuid)}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded-full hover:bg-red-100 text-red-400 hover:text-red-600 transition-all"
                          title="Hapus percakapan"
                        >
                          <Trash2 size={14} />
                        </button>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{c.updated_at ? new Date(c.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <p className="text-sm text-gray-500 truncate pr-2 flex-1">
                        {c.lastMessage || <span className="italic">Ketuk untuk membuka chat...</span>}
                      </p>
                      {c.unread_count > 0 && <span className="bg-teal-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0">{c.unread_count}</span>}
                    </div>
                    
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${sc.bg}`}>{sc.label}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT PANEL (MAIN CHAT AREA) ─── */}
      <div className={`flex-1 flex flex-col bg-[#efeae2] relative overflow-hidden ${!selectedChat ? 'hidden md:flex' : 'flex'} min-w-0`}>
        {!selectedChat ? (
          /* Empty State (WhatsApp Background equivalent) */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-4 bg-gradient-to-br from-gray-50 via-teal-50/30 to-sky-50/30 relative z-10">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-teal-400/[0.05] rounded-full blur-[80px] animate-float-slow" />
              <div className="absolute bottom-10 -left-20 w-72 h-72 bg-sky-400/[0.05] rounded-full blur-[80px] animate-float-slow-reverse" />
            </div>
            <div className="relative z-20 flex flex-col items-center">
              <div className="w-32 h-32 bg-white rounded-full shadow-xl shadow-teal-100/50 flex items-center justify-center mb-6">
                <Sparkles size={64} className="text-teal-500" />
              </div>
              <h1 className="text-3xl font-light text-gray-700 mb-4 tracking-tight">Growell Web Konsultasi</h1>
              <p className="text-gray-500 mb-8 max-w-sm">Tanyakan ahli gizi mengenai status gizi anak. Pesan pribadi dan dilindungi kerahasiaannya.</p>
              {userData?.role === 'orang_tua' && (
                <button onClick={handleOpenNewChatModal} className="px-6 py-3 bg-gradient-to-r from-teal-500 to-sky-600 text-white font-semibold rounded-full shadow-lg hover:shadow-xl hover:shadow-teal-200/50 hover:scale-105 transition-all flex items-center gap-2">
                  <MessageSquarePlus size={20} /> Mulai Chat Baru
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Active Chat Interface */
          <div className="flex-1 flex flex-col relative z-20 min-h-0 overflow-hidden">
            {/* WhatsApp Web inspired Chat Background pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")' }}></div>

            {/* Chat Header */}
            <div className="h-16 px-4 sm:px-6 bg-white border-b border-gray-200 flex items-center justify-between z-30 shadow-sm relative flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <button onClick={() => { setSelectedChat(null); window.history.pushState({}, '', '/konsultasi'); }} className="md:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 rounded-full flex-shrink-0">
                  <ArrowLeft size={20} />
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0 ${userData?.role === 'orang_tua' ? 'bg-gradient-to-br from-indigo-500 to-cyan-500' : 'bg-gradient-to-br from-emerald-400 to-teal-600'}`}>
                  {(userData?.role === 'orang_tua' ? selectedChat.ahli_gizi_nama : selectedChat.orang_tua_nama)?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex flex-col min-w-0">
                  <h2 className="font-semibold text-gray-900 text-[15px] leading-tight truncate">
                    {userData?.role === 'orang_tua' ? selectedChat.ahli_gizi_nama || 'Menunggu Penugasan...' : selectedChat.orang_tua_nama}
                  </h2>
                  <span className="text-[12px] text-gray-500">{userData?.role === 'orang_tua' ? 'Ahli Gizi' : 'Orang Tua'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 relative" ref={headerMenuRef}>
                <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase ${statusConfig[selectedChat.status]?.bg || 'bg-gray-100'}`}>
                  {selectedChat.status}
                </span>
                {/* Header More Menu */}
                <button
                  onClick={() => setShowHeaderMenu(v => !v)}
                  className="p-2 hover:bg-gray-100 rounded-full transition"
                >
                  <MoreVertical size={18} className="text-gray-500" />
                </button>
                {showHeaderMenu && (
                  <div className="absolute right-0 top-10 bg-white rounded-xl shadow-xl border border-gray-100 z-50 py-1.5 min-w-[190px] overflow-hidden">
                    {['ahli_gizi', 'puskesmas'].includes(userData?.role) && ['menunggu', 'aktif'].includes(selectedChat.status) && (
                      <button
                        onClick={() => { setShowHeaderMenu(false); handleEndConsultation(); }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-orange-600 hover:bg-orange-50 transition"
                      >
                        <CheckCircle2 size={16} /> Akhiri Sesi
                      </button>
                    )}
                    <button
                      onClick={handleClearHistory}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                    >
                      <Trash2 size={16} /> Hapus Riwayat Chat
                    </button>
                    <button
                      onClick={handleDeleteConsultation}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 size={16} /> Hapus Percakapan
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1 z-30" style={{ backgroundImage: "url('https://i.pinimg.com/736x/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')", backgroundSize: 'cover', backgroundBlendMode: 'overlay', backgroundColor: 'rgba(255,255,255,0.85)' }}>
              
              <div className="flex justify-center mb-6 pt-2">
                <div className="bg-teal-50/80 backdrop-blur-sm px-4 py-2 rounded-xl shadow-sm text-xs text-teal-900 text-center max-w-sm leading-relaxed border border-teal-200">
                  <Clock size={12} className="inline mr-1 -mt-0.5" /> Konsultasi dibuat pada {new Date(selectedChat.created_at).toLocaleDateString()}. Percakapan ini dilindungi enkripsi standar.
                </div>
              </div>

              {isChatLoading && messages.length === 0 ? (
                <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-cyan-600" /></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-10 opacity-70">
                   <p className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full inline-block text-xs text-gray-500 shadow-sm border border-gray-100">Kirim pesan pertama Anda untuk memulai konsultasi</p>
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.pengirim_id === userData?.id;
                  const showTail = idx === 0 || messages[idx-1]?.pengirim_id !== msg.pengirim_id;
                  const isActive = ['aktif', 'menunggu'].includes(selectedChat.status);
                  
                  return (
                    <div key={msg.uuid || idx} className={`flex group ${isMe ? 'justify-end' : 'justify-start'} ${showTail ? 'mt-3' : 'mt-0.5'}`}>
                      <div className="flex items-end gap-1">
                        {/* Context menu trigger — left side for own messages */}
                        {isMe && isActive && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity self-center relative">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setContextMenu(prev =>
                                  prev?.msgUuid === msg.uuid ? null : { msgUuid: msg.uuid, isMe }
                                );
                              }}
                              className="p-1 rounded-full hover:bg-black/10 text-gray-400"
                            >
                              <MoreVertical size={15} />
                            </button>
                          </div>
                        )}

                        <div className={`relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2.5 shadow-sm text-[15px] leading-snug rounded-xl ${isMe ? 'bg-[#d9fdd3] text-[#111b21] rounded-tr-none' : 'bg-white text-[#111b21] rounded-tl-none border border-gray-100'}`}>
                          {showTail && (
                            <div className={`absolute top-0 w-3 h-3 ${isMe ? '-right-2 bg-[#d9fdd3] rounded-bl-full' : '-left-2 bg-white border-l border-t border-gray-100 rounded-br-full'}`} style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%)' }}></div>
                          )}
                          {!isMe && showTail && (
                            <div className="font-bold text-[13px] mb-1 opacity-90 text-teal-600">{msg.pengirim_nama}</div>
                          )}
                          <span className="whitespace-pre-wrap flex-1 min-w-0 break-words">{msg.pesan}</span>
                          <div className="float-right ml-3 mt-1.5 text-[10px] text-gray-500 flex items-center gap-1">
                            {msg.is_edited && <span className="italic opacity-70">diedit</span>}
                            {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            {isMe && <CheckCircle2 size={12} className="text-blue-500 ml-0.5" />}
                          </div>
                          <div className="clear-both"></div>

                          {/* Context Menu Dropdown */}
                          {contextMenu?.msgUuid === msg.uuid && (
                            <div
                              ref={contextMenuRef}
                              className={`absolute z-50 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 min-w-[160px] ${isMe ? 'right-0' : 'left-0'} bottom-full mb-1`}
                              onClick={e => e.stopPropagation()}
                            >
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                              >
                                <Pencil size={15} /> Edit Pesan
                              </button>
                              <button
                                onClick={() => handleDeleteMessage(msg.uuid)}
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                              >
                                <Trash2 size={15} /> Hapus Pesan
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} className="h-2" />
            </div>

            {/* Message Input Form */}
            {['aktif', 'menunggu'].includes(selectedChat.status) ? (
              <div className="bg-[#f0f2f5] px-4 py-3 z-30 flex-shrink-0">
                {/* Edit mode indicator */}
                {editingMsg && (
                  <div className="flex items-center justify-between bg-teal-50 border-l-4 border-teal-500 px-3 py-1.5 rounded-r-lg mb-2 text-sm">
                    <div className="flex items-center gap-2 min-w-0">
                      <Pencil size={14} className="text-teal-600 flex-shrink-0" />
                      <span className="text-teal-700 font-medium">Mengedit pesan:</span>
                      <span className="text-gray-500 truncate">{editingMsg.pesan}</span>
                    </div>
                    <button onClick={handleCancelEdit} className="ml-2 p-1 flex-shrink-0 hover:bg-teal-100 rounded-full">
                      <X size={14} className="text-teal-600" />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSend} className="w-full flex items-center gap-3 relative">
                  <textarea 
                    ref={inputRef}
                    value={newMessage} 
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend(e);
                      }
                      if (e.key === 'Escape' && editingMsg) handleCancelEdit();
                    }}
                    placeholder={editingMsg ? 'Edit pesan...' : 'Ketik pesan...'} 
                    className="w-full bg-white px-4 py-2.5 sm:py-3 rounded-2xl border-none outline-none resize-none max-h-32 text-[15px] shadow-sm focus:ring-1 focus:ring-teal-200"
                    rows={1}
                    style={{ minHeight: '44px' }}
                  />
                  <button 
                    type="submit" 
                    disabled={!newMessage.trim() || isSending} 
                    className={`flex-shrink-0 w-12 h-12 rounded-full text-white flex items-center justify-center transition shadow-md disabled:bg-gray-300 disabled:shadow-none ${editingMsg ? 'bg-teal-500 hover:bg-teal-600' : 'bg-teal-600 hover:bg-teal-700'}`}
                  >
                    {isSending ? <Loader2 size={20} className="animate-spin" /> : editingMsg ? <CheckCircle2 size={20} /> : <Send size={20} className="ml-1" />}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-gray-100 p-4 text-center z-30 flex-shrink-0">
                <p className="text-sm text-gray-500 bg-white inline-block px-4 py-2 rounded-full shadow-sm">
                  Sesi konsultasi ini telah <strong>{selectedChat.status}</strong>. Anda tidak dapat membalas pesan.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── MODAL NEW CONSULTATION (WITH AHLI GIZI SELECTOR) ─── */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Chat Konsultasi Baru</h3>
                <p className="text-sm text-gray-500 mt-0.5">Pilih ahli gizi yang ingin Anda konsultasikan</p>
              </div>
              <button onClick={() => { setShowNewChatModal(false); setSelectedAhliGiziId(''); setNewChatError(''); }} className="p-2 hover:bg-gray-100 rounded-full transition flex-shrink-0"><X size={20} className="text-gray-500" /></button>
            </div>
            
            <div className="space-y-4 mt-5">
              {/* Ahli Gizi Selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Pilih Ahli Gizi <span className="text-red-500">*</span></label>
                {availableAhliGizi.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-sm italic py-4 text-center">
                    Sedang memuat atau tidak ada Ahli Gizi aktif saat ini.
                  </div>
                ) : (
                  <div className="grid gap-2 max-h-48 overflow-y-auto pr-1 stylish-scrollbar">
                    {availableAhliGizi.map(ag => (
                      <label key={ag.id} className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${selectedAhliGiziId === ag.id ? 'border-teal-500 bg-teal-50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                        <input type="radio" name="ahligizi" value={ag.id} checked={selectedAhliGiziId === ag.id} onChange={() => setSelectedAhliGiziId(ag.id)} className="w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500" />
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                          {ag.nama.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-gray-900">{ag.nama}</p>
                          <p className="text-xs text-gray-500">{ag.no_telepon || 'Ahli Gizi Tersertifikasi'}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {newChatError && <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl p-3 text-sm">{newChatError}</div>}
              
              <div className="pt-1">
                <button 
                  onClick={handleCreateConsultation} 
                  disabled={isCreatingChat || !selectedAhliGiziId} 
                  className="w-full px-4 py-3.5 text-sm font-bold text-white bg-gradient-to-r from-teal-500 to-sky-600 rounded-xl hover:shadow-lg hover:shadow-teal-200/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreatingChat ? <><Loader2 size={18} className="animate-spin" /> Memulai...</> : <><MessageSquarePlus size={18} /> Mulai Chat Sekarang</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Style for scrollbar to make it WhatsApp like */}
      <style dangerouslySetInnerHTML={{__html: `
        .stylish-scrollbar::-webkit-scrollbar { width: 6px; }
        .stylish-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .stylish-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 20px; }
      `}} />
    </div>
  );
}

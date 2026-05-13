import { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Send, MessageSquare, Search, Paperclip, FileText, Image,
  File, X, Download, Clock, CheckCheck, ArrowLeft, Users
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';
import GroupChatPanel from '../../components/chat/GroupChatPanel';
import useDebouncedValue from '../../hooks/useDebouncedValue';

const SuperAdminChat = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIdx, setMentionIdx] = useState(0);
  const [chatMode, setChatMode] = useState('direct');
  const [groupUnread, setGroupUnread] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);
  const activeContactRef = useRef(null);
  const debouncedSearchQuery = useDebouncedValue(searchQuery.trim(), 250);

  useEffect(() => {
    activeContactRef.current = activeContact;
  }, [activeContact]);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('SUPER_ADMIN_accessToken') },
    });
    setSocket(newSocket);
    newSocket.on('newMessage', (msg) => {
      const currentContact = activeContactRef.current;
      if (msg.senderId === currentContact?.id || msg.receiverId === currentContact?.id) {
        setMessages((prev) => (prev.some((item) => item.id === msg.id) ? prev : [...prev, msg]));
      }
      fetchContacts();
    });
    return () => newSocket.disconnect();
  }, []);

  useEffect(() => { fetchContacts(); fetchGroupUnread(); }, []);

  const fetchGroupUnread = async () => {
    try {
      const res = await api.get('/group-chat/my-groups');
      const total = (res.data || []).reduce((sum, g) => sum + (g.unreadCount || 0), 0);
      setGroupUnread(total);
    } catch {}
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/chat/contacts');
      setContacts(res.data);
    } catch (err) {
      console.error('Failed to load contacts');
    }
  };

  const selectContact = async (contact) => {
    activeContactRef.current = contact;
    setActiveContact(contact);
    setShowMobileSidebar(false);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/messages/${contact.id}`);
      setMessages(res.data);
      socket?.emit('joinChat', { userId: user.id, otherUserId: contact.id });
    } catch (err) {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text && !attachedFile) return;
    if (!activeContact) return;

    let msgText = text;
    if (attachedFile) {
      const fileInfo = `📎 ${attachedFile.name} (${formatFileSize(attachedFile.size)})`;
      msgText = text ? `${fileInfo}\n${text}` : fileInfo;
    }

    try {
      const res = await api.post('/chat/messages', { receiverId: activeContact.id, message: msgText });
      socket?.emit('sendMessage', res.data);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      toast.error('Failed to send message');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
    setAttachedFile(file);
  };

  const removeAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const getDateLabel = (dateStr) => {
    const d = new Date(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM dd, yyyy');
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return <File size={14} />;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(ext)) return <Image size={14} />;
    if (['pdf', 'doc', 'docx', 'txt', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return <FileText size={14} />;
    return <File size={14} />;
  };

  const parseMessage = (text) => {
    if (!text) return { isFile: false, fileName: null, fileSize: null, textContent: text };
    const fileMatch = text.match(/^📎\s+(.+?)\s+\(([^)]+)\)/);
    if (fileMatch) {
      const remaining = text.replace(fileMatch[0], '').trim();
      return { isFile: true, fileName: fileMatch[1], fileSize: fileMatch[2], textContent: remaining };
    }
    return { isFile: false, fileName: null, fileSize: null, textContent: text };
  };

  const groupedMessages = useMemo(() => messages.reduce((groups, msg) => {
    const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {}), [messages]);

  const filteredContacts = useMemo(() => {
    const query = debouncedSearchQuery.toLowerCase();
    if (!query) return contacts;
    return contacts.filter(c =>
      c.fullName?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query)
    );
  }, [contacts, debouncedSearchQuery]);

  const totalUnread = useMemo(() => contacts.reduce((sum, c) => sum + (c.unreadCount || 0), 0), [contacts]);

  const getRoleLabel = (role) => {
    if (role === 'SUPER_ADMIN') return 'Super Admin';
    if (role === 'ADMIN') return 'Admin';
    if (role === 'STUDENT') return 'Student';
    return role;
  };

  const getRoleBadge = (role) => {
    if (role === 'SUPER_ADMIN') return { text: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' };
    if (role === 'ADMIN') return { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' };
    return { text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' };
  };

  // @mention logic
  const mentionSuggestions = useMemo(() => {
    if (!showMentions) return [];
    return contacts.filter(c =>
      c.fullName?.toLowerCase().includes(mentionQuery.toLowerCase())
    ).slice(0, 8);
  }, [contacts, mentionQuery, showMentions]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setNewMessage(val);
    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([^@\[\]]*)$/);
    if (atMatch !== null) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
      setMentionIdx(0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (contact) => {
    const input = inputRef.current;
    if (!input) return;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = newMessage.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');
    const before = newMessage.slice(0, atIdx);
    const after = newMessage.slice(cursorPos);
    const updated = `${before}@[${contact.fullName}] ${after}`;
    setNewMessage(updated);
    setShowMentions(false);
    setTimeout(() => {
      const newPos = atIdx + contact.fullName.length + 4;
      input.focus();
      input.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const handleMentionKeyDown = (e) => {
    if (!showMentions || mentionSuggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setMentionIdx(prev => (prev + 1) % mentionSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setMentionIdx(prev => (prev - 1 + mentionSuggestions.length) % mentionSuggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      insertMention(mentionSuggestions[mentionIdx]);
    } else if (e.key === 'Escape') {
      setShowMentions(false);
    }
  };

  const renderMessageText = (text, isMine = false) => {
    if (!text) return text;
    const parts = text.split(/(@\[[^\]]+\])/g);
    return parts.map((part, i) => {
      const mentionMatch = part.match(/^@\[([^\]]+)\]$/);
      if (mentionMatch) {
        return (
          <span key={i} className={`px-1 rounded font-semibold text-[12px] ${isMine ? 'bg-blue-500/40 text-white' : 'bg-blue-100 text-blue-700'}`}>
            @{mentionMatch[1]}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] gap-2">
      {/* Tab Toggle */}
      <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-200 p-1 self-start">
        <button
          onClick={() => setChatMode('direct')}
          className={`px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all ${chatMode === 'direct' ? 'bg-blue-600 text-white shadow-sm' : totalUnread > 0 ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <span className="flex items-center gap-1.5"><MessageSquare size={13} /> Direct{totalUnread > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-blue-600 text-white rounded-full leading-none">{totalUnread}</span>}</span>
        </button>
        <button
          onClick={() => { setChatMode('group'); fetchGroupUnread(); }}
          className={`px-4 py-1.5 rounded-md text-[12px] font-semibold transition-all ${chatMode === 'group' ? 'bg-violet-600 text-white shadow-sm' : groupUnread > 0 ? 'bg-blue-100 text-blue-600 font-semibold' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <span className="flex items-center gap-1.5"><Users size={13} /> Group{groupUnread > 0 && <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-violet-600 text-white rounded-full leading-none">{groupUnread}</span>}</span>
        </button>
      </div>

      {chatMode === 'group' ? (
        <div className="flex-1 flex flex-col min-h-0 bg-white rounded-xl border border-gray-200 overflow-hidden">
          <GroupChatPanel socket={socket} />
        </div>
      ) : (
    <div className="flex flex-1 h-full bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm min-h-0">
      {/* ─── Contacts Sidebar ─── */}
      <div className={`${showMobileSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r border-gray-100 flex-col bg-gray-50/30`}>
        {/* Sidebar Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">Messages</h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full">{totalUnread}</span>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="flex-1 overflow-y-auto">
          {filteredContacts.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-[12px] text-gray-400">{searchQuery ? 'No contacts found' : 'No contacts yet'}</p>
            </div>
          ) : (
            filteredContacts.map((contact) => {
              const isActive = activeContact?.id === contact.id;
              return (
                <button
                  key={contact.id}
                  onClick={() => selectContact(contact)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all border-b border-gray-50 ${isActive ? 'bg-blue-50/70 border-l-2 border-l-blue-600' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0 ${isActive ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'}`}>
                    {getInitials(contact.fullName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`text-[13px] font-semibold truncate ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>{contact.fullName}</p>
                        {contact.role !== 'STUDENT' && (() => {
                          const badge = getRoleBadge(contact.role, contact.department);
                          return (
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${badge.text} ${badge.bg} ${badge.border}`}>
                              {getRoleLabel(contact.role, contact.department)}
                            </span>
                          );
                        })()}
                      </div>
                      {contact.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-blue-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{contact.lastMessage || contact.email}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Chat Area ─── */}
      <div className={`${!showMobileSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white`}>
        {activeContact ? (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-white">
              <button
                onClick={() => { setShowMobileSidebar(true); setActiveContact(null); }}
                className="md:hidden p-1 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-[12px] font-bold ring-1 ring-slate-600/20 flex-shrink-0">
                {getInitials(activeContact.fullName)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{activeContact.fullName}</p>
                <p className="text-[11px] text-gray-500">{activeContact.email}</p>
              </div>
              <span className="text-[10px] font-medium text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                {getRoleLabel(activeContact.role, activeContact.department)}
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/40">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <MessageSquare size={24} className="text-gray-300" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-500">No messages yet</p>
                  <p className="text-[11px] text-gray-400 mt-1">Send a message to start the conversation</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                  <div key={dateKey}>
                    <div className="flex items-center justify-center my-4">
                      <span className="px-3 py-1 bg-white text-[10px] font-semibold text-gray-400 rounded-full border border-gray-100 shadow-sm">
                        {getDateLabel(dateKey)}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {msgs.map((msg, idx) => {
                        const isMine = msg.senderId === user.id;
                        const parsed = parseMessage(msg.message);
                        return (
                          <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {!isMine && (
                              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 text-[9px] font-bold mr-2 mt-1 flex-shrink-0">
                                {getInitials(activeContact.fullName)}
                              </div>
                            )}
                            <div className={`max-w-[65%] ${isMine ? 'order-1' : ''}`}>
                              {parsed.isFile && (
                                <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl mb-1 ${isMine ? 'bg-blue-600' : 'bg-white border border-gray-200'}`}>
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-blue-500/30 text-blue-100' : 'bg-gray-100 text-gray-500'}`}>
                                    {getFileIcon(parsed.fileName)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className={`text-[12px] font-medium truncate ${isMine ? 'text-white' : 'text-gray-800'}`}>{parsed.fileName}</p>
                                    <p className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>{parsed.fileSize}</p>
                                  </div>
                                  <Download size={13} className={`flex-shrink-0 cursor-pointer ${isMine ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} />
                                </div>
                              )}
                              {parsed.textContent && (
                                <div className={`px-3.5 py-2.5 ${isMine
                                  ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                                  : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-md shadow-sm'}`}>
                                  <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{renderMessageText(parsed.textContent, isMine)}</p>
                                </div>
                              )}
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <p className="text-[10px] text-gray-400">
                                  {format(new Date(msg.createdAt), 'h:mm a')}
                                </p>
                                {isMine && <CheckCheck size={11} className="text-blue-400" />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* File Attachment Preview */}
            {attachedFile && (
              <div className="px-5 py-2.5 bg-blue-50/60 border-t border-blue-100 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                  {getFileIcon(attachedFile.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium text-gray-800 truncate">{attachedFile.name}</p>
                  <p className="text-[10px] text-gray-500">{formatFileSize(attachedFile.size)}</p>
                </div>
                <button onClick={removeAttachment} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Message Input */}
            <form onSubmit={sendMessage} className="px-5 py-3.5 border-t border-gray-100 bg-white relative">
              {/* @Mention Popup */}
              {showMentions && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-5 right-5 mb-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto z-50">
                  <div className="px-3 py-1.5 border-b border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mention someone</p>
                  </div>
                  {mentionSuggestions.map((contact, idx) => {
                    const badge = getRoleBadge(contact.role, contact.department);
                    return (
                      <button
                        key={contact.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertMention(contact)}
                        className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors ${idx === mentionIdx ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${idx === mentionIdx ? 'bg-blue-600 text-white' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'}`}>
                          {getInitials(contact.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-gray-900 truncate">{contact.fullName}</span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.text} ${badge.bg} ${badge.border}`}>
                              {getRoleLabel(contact.role, contact.department)}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  className="hidden"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.gif,.svg,.zip,.rar"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleMentionKeyDown}
                  onBlur={() => setTimeout(() => setShowMentions(false), 200)}
                  placeholder="Type @ to mention someone..."
                  className="flex-1 px-4 py-2.5 text-[13px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() && !attachedFile}
                  className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
                >
                  <Send size={17} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <MessageSquare size={28} className="text-gray-300" />
            </div>
            <p className="text-[14px] font-medium text-gray-500">Select a contact to start chatting</p>
            <p className="text-[12px] text-gray-400 mt-1">Choose from your contacts on the left</p>
          </div>
        )}
      </div>
    </div>
      )}
    </div>
  );
};

export default SuperAdminChat;

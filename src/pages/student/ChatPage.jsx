import { useState, useEffect, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Send, MessageSquare, Search, Paperclip, FileText, Image,
  File, X, Download, CheckCheck, ChevronUp, ChevronDown, FolderOpen
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const ChatPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [chatSearch, setChatSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMatchIdx, setSearchMatchIdx] = useState(0);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const matchRefs = useRef({});

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('STUDENT_accessToken') },
    });
    newSocket.emit('register', user.id);
    setSocket(newSocket);

    newSocket.on('newMessage', (msg) => {
      if (msg.senderId === activeContact?.id || msg.receiverId === activeContact?.id) {
        setMessages((prev) => [...prev, msg]);
      }
      fetchContacts();
    });

    return () => newSocket.disconnect();
  }, [activeContact]);

  useEffect(() => { fetchContacts(); }, []);

  // Auto-select first contact (the assigned mentor)
  useEffect(() => {
    if (contacts.length > 0 && !activeContact) {
      selectContact(contacts[0]);
    }
  }, [contacts]);

  useEffect(() => {
    if (!searchOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Search match indices
  const searchMatches = useMemo(() => {
    if (!chatSearch.trim()) return [];
    const q = chatSearch.toLowerCase();
    const matches = [];
    messages.forEach((msg, i) => {
      if (msg.message?.toLowerCase().includes(q)) {
        matches.push(i);
      }
    });
    return matches;
  }, [messages, chatSearch]);

  // Scroll to current match
  useEffect(() => {
    if (searchMatches.length > 0) {
      const msgIdx = searchMatches[searchMatchIdx];
      const el = matchRefs.current[msgIdx];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [searchMatchIdx, searchMatches]);

  // Reset match index when search changes
  useEffect(() => {
    setSearchMatchIdx(0);
  }, [chatSearch]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/chat/contacts');
      setContacts(res.data);
    } catch (err) {
      console.error('Failed to load contacts');
    }
  };

  const selectContact = async (contact) => {
    setActiveContact(contact);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/messages/${contact.id}`);
      setMessages(res.data);
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

  const highlightText = (text) => {
    if (!chatSearch.trim() || !text) return text;
    const q = chatSearch.trim();
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-amber-200 text-inherit rounded-sm px-0.5">{part}</mark>
        : part
    );
  };

  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const sharedFiles = useMemo(() => {
    return messages
      .filter((msg) => msg.senderId !== user.id)
      .map((msg) => ({ ...parseMessage(msg.message), createdAt: msg.createdAt }))
      .filter((p) => p.isFile);
  }, [messages, user.id]);

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-3">
      {/* Main Chat Card */}
      <div className="flex flex-col flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden min-w-0">
      {activeContact ? (
        <>
          {/* Chat Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white shrink-0">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-[13px] font-bold text-gray-900">{activeContact.fullName}</p>
                <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  Mentor
                </span>
              </div>
            </div>
            <button
              onClick={() => { setSearchOpen(!searchOpen); if (searchOpen) setChatSearch(''); }}
              className={`p-1.5 rounded-md transition-colors ${searchOpen ? 'bg-blue-50 text-blue-600' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
              title="Search in chat"
            >
              <Search size={15} />
            </button>
          </div>

          {/* Search Bar (slides open) */}
          {searchOpen && (
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2 shrink-0">
              <Search size={13} className="text-gray-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search messages & files..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="flex-1 text-[12px] bg-transparent outline-none placeholder-gray-400 text-gray-700"
              />
              {searchMatches.length > 0 && (
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-gray-400 font-medium">
                    {searchMatchIdx + 1}/{searchMatches.length}
                  </span>
                  <button
                    onClick={() => setSearchMatchIdx((prev) => (prev - 1 + searchMatches.length) % searchMatches.length)}
                    className="p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronUp size={13} />
                  </button>
                  <button
                    onClick={() => setSearchMatchIdx((prev) => (prev + 1) % searchMatches.length)}
                    className="p-0.5 text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={13} />
                  </button>
                </div>
              )}
              {chatSearch && searchMatches.length === 0 && (
                <span className="text-[10px] text-gray-400">No results</span>
              )}
              <button
                onClick={() => { setSearchOpen(false); setChatSearch(''); }}
                className="p-0.5 text-gray-400 hover:text-gray-600"
              >
                <X size={13} />
              </button>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/40">
            {loadingMessages ? (
              <div className="flex justify-center py-12">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                  <MessageSquare size={20} className="text-gray-300" />
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
                      const globalIdx = messages.indexOf(msg);
                      const isHighlighted = searchMatches.includes(globalIdx);
                      return (
                        <div
                          key={msg.id || idx}
                          ref={(el) => { if (isHighlighted) matchRefs.current[globalIdx] = el; }}
                          className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${isHighlighted && globalIdx === searchMatches[searchMatchIdx] ? 'ring-2 ring-amber-300 ring-offset-2 rounded-xl' : ''}`}
                        >
                          <div className={`max-w-[65%] ${isMine ? 'order-1' : ''}`}>
                            {parsed.isFile && (
                              <div className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl mb-1 ${isMine ? 'bg-blue-600' : 'bg-white border border-gray-200'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isMine ? 'bg-blue-500/30 text-blue-100' : 'bg-gray-100 text-gray-500'}`}>
                                  {getFileIcon(parsed.fileName)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={`text-[12px] font-medium truncate ${isMine ? 'text-white' : 'text-gray-800'}`}>{chatSearch ? highlightText(parsed.fileName) : parsed.fileName}</p>
                                  <p className={`text-[10px] ${isMine ? 'text-blue-200' : 'text-gray-400'}`}>{parsed.fileSize}</p>
                                </div>
                                <Download size={13} className={`flex-shrink-0 cursor-pointer ${isMine ? 'text-blue-200 hover:text-white' : 'text-gray-400 hover:text-gray-600'}`} />
                              </div>
                            )}
                            {parsed.textContent && (
                              <div className={`px-3.5 py-2.5 ${isMine
                                ? 'bg-blue-600 text-white rounded-2xl rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-md shadow-sm'}`}>
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{chatSearch ? highlightText(parsed.textContent) : parsed.textContent}</p>
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
            <div className="px-5 py-2.5 bg-blue-50/60 border-t border-blue-100 flex items-center gap-3 shrink-0">
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
          <form onSubmit={sendMessage} className="px-4 py-3 border-t border-gray-100 bg-white shrink-0">
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
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                title="Attach file"
              >
                <Paperclip size={16} />
              </button>
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 px-3.5 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 focus:bg-white transition-all"
              />
              <button
                type="submit"
                disabled={!newMessage.trim() && !attachedFile}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              >
                <Send size={15} />
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-3">
            <MessageSquare size={20} className="text-gray-300" />
          </div>
          <p className="text-[13px] font-semibold text-gray-600">Loading chat...</p>
          <p className="text-[11px] text-gray-400 mt-1">Connecting to your mentor</p>
        </div>
      )}
      </div>

      {/* Shared Files Side Panel */}
      {activeContact && (
        <div className="w-[260px] flex-shrink-0 bg-white rounded-lg border border-gray-200 flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-2">
              <FolderOpen size={14} className="text-blue-600" />
              <span className="text-[13px] font-bold text-gray-900">Shared Files</span>
              {sharedFiles.length > 0 && (
                <span className="ml-auto text-[10px] font-medium text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  {sharedFiles.length}
                </span>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3">
            {sharedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mb-2">
                  <FileText size={18} className="text-gray-300" />
                </div>
                <p className="text-[12px] font-medium text-gray-400">No files shared yet</p>
                <p className="text-[10px] text-gray-300 mt-0.5">Files from your mentor will appear here</p>
              </div>
            ) : (
              <div className="space-y-2">
                {sharedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="group flex items-center gap-2.5 p-2.5 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center text-gray-500 group-hover:text-blue-600 transition-colors flex-shrink-0">
                      {getFileIcon(file.fileName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium text-gray-800 truncate">{file.fileName}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-gray-400">{file.fileSize}</span>
                        <span className="text-[9px] text-gray-300">&middot;</span>
                        <span className="text-[9px] text-gray-400">{format(new Date(file.createdAt), 'MMM d')}</span>
                      </div>
                    </div>
                    <Download size={12} className="text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatPage;

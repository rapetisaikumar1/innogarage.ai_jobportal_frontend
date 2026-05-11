import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Send, MessageSquare, Search, Users, ArrowLeft, CheckCheck
} from 'lucide-react';
import { format, isToday, isYesterday } from 'date-fns';

const GroupChatPanel = ({ socket }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIdx, setMentionIdx] = useState(0);
  const [members, setMembers] = useState([]);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { fetchGroups(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Listen for real-time group messages
  useEffect(() => {
    if (!socket || !activeGroup) return;
    socket.emit('joinGroup', activeGroup.id);

    const handler = (msg) => {
      if (msg.groupId === activeGroup.id) {
        setMessages((prev) => [...prev, msg]);
      }
      fetchGroups();
    };
    socket.on('newGroupMessage', handler);
    return () => socket.off('newGroupMessage', handler);
  }, [socket, activeGroup]);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/group-chat/my-groups', {
        headers: { 'Cache-Control': 'no-cache' },
        params: { _t: Date.now() },
      });
      setGroups(res.data || []);
    } catch (err) {
      console.error('Failed to load groups:', err?.response?.status, err?.response?.data || err.message);
    } finally {
      setLoadingGroups(false);
    }
  };

  const selectGroup = async (group) => {
    setActiveGroup(group);
    setShowMobileSidebar(false);
    setLoadingMessages(true);
    try {
      const [msgRes, memRes] = await Promise.all([
        api.get(`/group-chat/${group.id}/messages`),
        api.get(`/group-chat/${group.id}/members`),
      ]);
      setMessages(msgRes.data);
      setMembers(memRes.data);
      socket?.emit('joinGroup', group.id);
    } catch (err) {
      toast.error('Failed to load group messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = newMessage.trim();
    if (!text || !activeGroup) return;

    try {
      const res = await api.post(`/group-chat/${activeGroup.id}/messages`, { message: text });
      socket?.emit('sendGroupMessage', { ...res.data, groupId: activeGroup.id });
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
    } catch (err) {
      toast.error('Failed to send message');
    }
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

  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = format(new Date(msg.createdAt), 'yyyy-MM-dd');
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  const totalUnread = groups.reduce((sum, g) => sum + (g.unreadCount || 0), 0);

  const filteredGroups = groups.filter(g =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.student?.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // @mention logic using group members
  const mentionSuggestions = useMemo(() => {
    if (!showMentions || !user) return [];
    return members
      .filter(m => m.id !== user.id && m.fullName?.toLowerCase().includes(mentionQuery.toLowerCase()))
      .slice(0, 8);
  }, [members, mentionQuery, showMentions, user?.id]);

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

  const insertMention = (member) => {
    const input = inputRef.current;
    if (!input) return;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = newMessage.slice(0, cursorPos);
    const atIdx = textBeforeCursor.lastIndexOf('@');
    const before = newMessage.slice(0, atIdx);
    const after = newMessage.slice(cursorPos);
    const updated = `${before}@[${member.fullName}] ${after}`;
    setNewMessage(updated);
    setShowMentions(false);
    setTimeout(() => {
      const newPos = atIdx + member.fullName.length + 4;
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
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* ─── Groups Sidebar ─── */}
      <div className={`${showMobileSidebar ? 'flex' : 'hidden'} md:flex w-full md:w-80 border-r border-gray-100 flex-col bg-gray-50/30`}>
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-bold text-gray-900">Group Chats</h2>
            {totalUnread > 0 && (
              <span className="px-2 py-0.5 bg-violet-600 text-white text-[10px] font-bold rounded-full">{totalUnread}</span>
            )}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingGroups ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-10">
              <Users size={24} className="mx-auto text-gray-300 mb-2" />
              <p className="text-[12px] text-gray-400">{searchQuery ? 'No groups found' : 'No groups yet'}</p>
            </div>
          ) : (
            filteredGroups.map((group) => {
              const isActive = activeGroup?.id === group.id;
              const memberCount = group.members?.length || 0;
              return (
                <button
                  key={group.id}
                  onClick={() => selectGroup(group)}
                  className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-all border-b border-gray-50 ${isActive ? 'bg-violet-50/70 border-l-2 border-l-violet-600' : 'hover:bg-gray-50'}`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[14px] flex-shrink-0 ${isActive ? 'bg-violet-600 text-white' : 'bg-gradient-to-br from-violet-100 to-violet-200 text-violet-600'}`}>
                    <Users size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-[13px] font-semibold truncate ${isActive ? 'text-violet-900' : 'text-gray-900'}`}>{group.name}</p>
                      {group.unreadCount > 0 && (
                        <span className="w-5 h-5 bg-violet-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                          {group.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">
                      {group.lastMessage || `${memberCount} members`}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── Group Chat Area ─── */}
      <div className={`${!showMobileSidebar ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-white`}>
        {activeGroup ? (
          <>
            {/* Chat Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3 bg-white">
              <button
                onClick={() => { setShowMobileSidebar(true); setActiveGroup(null); }}
                className="md:hidden p-1 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-white flex-shrink-0">
                <Users size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold text-gray-900">{activeGroup.name}</p>
                <p className="text-[11px] text-gray-500">
                  {members.map(m => m.fullName).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {members.slice(0, 3).map((m) => {
                  const badge = getRoleBadge(m.role, m.department);
                  return (
                    <span key={m.id} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.text} ${badge.bg} ${badge.border}`}>
                      {getRoleLabel(m.role, m.department)}
                    </span>
                  );
                })}
                {members.length > 3 && (
                  <span className="text-[9px] text-gray-400">+{members.length - 3}</span>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 bg-gray-50/40">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="w-7 h-7 border-3 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-3">
                    <Users size={24} className="text-gray-300" />
                  </div>
                  <p className="text-[13px] font-medium text-gray-500">No messages yet</p>
                  <p className="text-[11px] text-gray-400 mt-1">Send a message to start the group conversation</p>
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
                        const senderName = msg.sender?.fullName || 'Unknown';
                        const senderRole = msg.sender?.role;
                        const senderDept = msg.sender?.department;
                        const badge = senderRole ? getRoleBadge(senderRole, senderDept) : null;
                        return (
                          <div key={msg.id || idx} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                            {!isMine && (
                              <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 text-[9px] font-bold mr-2 mt-1 flex-shrink-0">
                                {getInitials(senderName)}
                              </div>
                            )}
                            <div className={`max-w-[65%] ${isMine ? 'order-1' : ''}`}>
                              {/* Sender name for others */}
                              {!isMine && (
                                <div className="flex items-center gap-1.5 mb-0.5">
                                  <span className="text-[11px] font-semibold text-gray-700">{senderName}</span>
                                  {badge && (
                                    <span className={`text-[8px] font-semibold px-1 py-0.5 rounded border ${badge.text} ${badge.bg} ${badge.border}`}>
                                      {getRoleLabel(senderRole, senderDept)}
                                    </span>
                                  )}
                                </div>
                              )}
                              <div className={`px-3.5 py-2.5 ${isMine
                                ? 'bg-violet-600 text-white rounded-2xl rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-100 rounded-2xl rounded-bl-md shadow-sm'}`}>
                                <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{renderMessageText(msg.message, isMine)}</p>
                              </div>
                              <div className={`flex items-center gap-1 mt-1 ${isMine ? 'justify-end' : 'justify-start'}`}>
                                <p className="text-[10px] text-gray-400">
                                  {format(new Date(msg.createdAt), 'h:mm a')}
                                </p>
                                {isMine && <CheckCheck size={11} className="text-violet-400" />}
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

            {/* Message Input */}
            <form onSubmit={sendMessage} className="px-5 py-3.5 border-t border-gray-100 bg-white relative">
              {/* @Mention Popup */}
              {showMentions && mentionSuggestions.length > 0 && (
                <div className="absolute bottom-full left-5 right-5 mb-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-48 overflow-y-auto z-50">
                  <div className="px-3 py-1.5 border-b border-gray-100">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mention someone</p>
                  </div>
                  {mentionSuggestions.map((member, idx) => {
                    const badge = getRoleBadge(member.role, member.department);
                    return (
                      <button
                        key={member.id}
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => insertMention(member)}
                        className={`w-full px-3 py-2 flex items-center gap-2.5 text-left transition-colors ${idx === mentionIdx ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${idx === mentionIdx ? 'bg-violet-600 text-white' : 'bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600'}`}>
                          {getInitials(member.fullName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[12px] font-semibold text-gray-900 truncate">{member.fullName}</span>
                            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${badge.text} ${badge.bg} ${badge.border}`}>
                              {getRoleLabel(member.role, member.department)}
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
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyDown={handleMentionKeyDown}
                  onBlur={() => setTimeout(() => setShowMentions(false), 200)}
                  placeholder="Type @ to mention someone..."
                  className="flex-1 px-4 py-2.5 text-[13px] bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2.5 bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0 shadow-sm"
                >
                  <Send size={17} />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Users size={28} className="text-gray-300" />
            </div>
            <p className="text-[14px] font-medium text-gray-500">Select a group to start chatting</p>
            <p className="text-[12px] text-gray-400 mt-1">Choose a group from the left</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatPanel;

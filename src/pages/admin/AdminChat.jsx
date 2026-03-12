import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Send, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

const AdminChat = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [activeContact, setActiveContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') },
    });
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/chat/contacts');
      setContacts(res.data);
    } catch (error) {
      console.error('Failed to load contacts');
    }
  };

  const selectContact = async (contact) => {
    setActiveContact(contact);
    setLoadingMessages(true);
    try {
      const res = await api.get(`/chat/messages/${contact.id}`);
      setMessages(res.data);
      socket?.emit('joinChat', { userId: user.id, otherUserId: contact.id });
    } catch (error) {
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeContact) return;
    try {
      const res = await api.post('/chat/messages', { receiverId: activeContact.id, message: newMessage });
      socket?.emit('sendMessage', res.data);
      setMessages((prev) => [...prev, res.data]);
      setNewMessage('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-xl border overflow-hidden">
      {/* Contacts Sidebar */}
      <div className="w-72 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-800">Messages</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contacts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No contacts yet</div>
          ) : (
            contacts.map((contact) => (
              <button key={contact.id} onClick={() => selectContact(contact)}
                className={`w-full p-3 flex items-center gap-3 text-left hover:bg-gray-50 transition-colors ${activeContact?.id === contact.id ? 'bg-primary-50 border-r-2 border-primary-600' : ''}`}>
                <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm shrink-0">
                  {contact.fullName?.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-800 text-sm truncate">{contact.fullName}</p>
                    {contact.unreadCount > 0 && (
                      <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{contact.unreadCount}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{contact.lastMessage || contact.email}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeContact ? (
          <>
            <div className="p-4 border-b flex items-center gap-3">
              <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-bold text-sm">
                {activeContact.fullName?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-800">{activeContact.fullName}</p>
                <p className="text-xs text-gray-500">{activeContact.role}</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loadingMessages ? (
                <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>
              ) : messages.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No messages yet. Start the conversation!</div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${msg.senderId === user.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${msg.senderId === user.id ? 'text-primary-100' : 'text-gray-400'}`}>
                        {format(new Date(msg.createdAt), 'hh:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} className="p-4 border-t flex gap-2">
              <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..."
                className="input-field flex-1" />
              <button type="submit" disabled={!newMessage.trim()} className="btn-primary px-4"><Send size={18} /></button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
            <MessageSquare size={48} className="mb-3" />
            <p>Select a contact to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminChat;

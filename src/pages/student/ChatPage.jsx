import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { io } from 'socket.io-client';
import { Send, MessageSquare } from 'lucide-react';

const ChatPage = () => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect to socket
    socketRef.current = io('http://localhost:5000');
    socketRef.current.emit('register', user.id);

    socketRef.current.on('newMessage', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    fetchContacts();

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const { data } = await api.get('/chat/contacts');
      setContacts(data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectContact = async (contact) => {
    setSelectedContact(contact);
    try {
      const { data } = await api.get(`/chat/messages/${contact.id}`);
      setMessages(data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedContact) return;

    try {
      const { data } = await api.post('/chat/messages', {
        receiverId: selectedContact.id,
        message: newMessage,
      });

      setMessages((prev) => [...prev, data]);

      socketRef.current?.emit('sendMessage', {
        receiverId: selectedContact.id,
        message: newMessage,
        senderId: user.id,
        senderName: user.fullName,
      });

      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Chat</h1>

      <div className="card p-0 flex h-[calc(100vh-220px)] overflow-hidden">
        {/* Contacts Sidebar */}
        <div className="w-72 border-r border-gray-200 flex flex-col">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-700">Contacts</h3>
          </div>
          <div className="flex-1 overflow-y-auto">
            {contacts.length === 0 ? (
              <p className="text-center text-gray-400 text-sm p-4">No contacts yet</p>
            ) : (
              contacts.map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => selectContact(contact)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 border-b border-gray-50 ${selectedContact?.id === contact.id ? 'bg-primary-50' : ''}`}
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
                    {contact.fullName?.charAt(0)}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium text-sm text-gray-800">{contact.fullName}</p>
                    <p className="text-xs text-gray-500">{contact.role === 'ADMIN' ? 'Mentor' : 'Student'}</p>
                  </div>
                  {contact.unreadCount > 0 && (
                    <span className="w-5 h-5 bg-primary-600 text-white text-xs rounded-full flex items-center justify-center">
                      {contact.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedContact ? (
            <>
              <div className="p-4 border-b border-gray-200 flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                  {selectedContact.fullName?.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">{selectedContact.fullName}</p>
                  <p className="text-xs text-gray-500">{selectedContact.email}</p>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, idx) => (
                  <div key={msg.id || idx} className={`flex ${msg.senderId === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${msg.senderId === user.id ? 'bg-primary-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'}`}>
                      {msg.message}
                      <p className={`text-[10px] mt-1 ${msg.senderId === user.id ? 'text-primary-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="p-4 border-t border-gray-200 flex gap-2">
                <input
                  type="text"
                  className="input-field flex-1"
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn-primary p-2.5">
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-3" />
                <p>Select a contact to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;

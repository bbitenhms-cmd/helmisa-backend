import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { chatAPI } from '../services/api';
import { getSocket } from '../services/socket';

const ChatPage = () => {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load chat and messages
  useEffect(() => {
    const loadChat = async () => {
      try {
        const [chatRes, messagesRes] = await Promise.all([
          chatAPI.getChat(chatId),
          chatAPI.getMessages(chatId)
        ]);
        
        setChat(chatRes.data.chat);
        setMessages(messagesRes.data.messages);
        setLoading(false);
        
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('Load chat error:', err);
        setLoading(false);
      }
    };

    if (chatId && session) {
      loadChat();
    }
  }, [chatId, session]);

  // WebSocket setup
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !chatId) return;

    // Join chat room
    socket.emit('join_chat', { chat_id: chatId });

    // Listen for new messages
    socket.on('new_message', (data) => {
      if (data.chat_id === chatId) {
        setMessages((prev) => [...prev, data.message]);
        setTimeout(scrollToBottom, 100);
      }
    });

    // Listen for typing indicator
    socket.on('user_typing', (data) => {
      if (data.chat_id === chatId && data.sender_id !== session.id) {
        setIsTyping(data.typing);
      }
    });

    // Cleanup
    return () => {
      socket.emit('leave_chat', { chat_id: chatId });
      socket.off('new_message');
      socket.off('user_typing');
    };
  }, [chatId, session]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const messageText = newMessage;
    setNewMessage('');

    try {
      const response = await chatAPI.sendMessage(chatId, messageText);
      const sentMessage = response.data.message;
      
      // Add to local messages
      setMessages((prev) => [...prev, sentMessage]);
      
      // Broadcast via socket
      const socket = getSocket();
      if (socket) {
        socket.emit('send_message', {
          chat_id: chatId,
          message: sentMessage
        });
      }
      
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Send message error:', err);
      setNewMessage(messageText); // Restore message
    } finally {
      setSending(false);
    }
  };

  const handleTyping = () => {
    const socket = getSocket();
    if (!socket) return;

    // Emit typing start
    socket.emit('typing_start', {
      chat_id: chatId,
      sender_id: session.id
    });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to emit typing stop
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', {
        chat_id: chatId,
        sender_id: session.id
      });
    }, 2000);
  };

  const getVibeColor = (vibe) => {
    const colors = {
      chill: 'from-blue-400 to-cyan-400',
      energetic: 'from-yellow-400 to-orange-400',
      romantic: 'from-pink-400 to-rose-400',
      social: 'from-purple-400 to-indigo-400'
    };
    return colors[vibe] || 'from-gray-400 to-gray-500';
  };

  const getVibeEmoji = (vibe) => {
    const emojis = {
      chill: '😌',
      energetic: '⚡',
      romantic: '💕',
      social: '🎉'
    };
    return emojis[vibe] || '🙂';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Chat bulunamadı</div>
      </div>
    );
  }

  const otherUser = chat.other_user;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-lg border-b border-white/20 p-4">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate('/lobby')}
            className="text-gray-300 hover:text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getVibeColor(otherUser.user.vibe)} flex items-center justify-center text-2xl`}>
            {getVibeEmoji(otherUser.user.vibe)}
          </div>
          
          <div className="flex-1">
            <h1 className="text-white font-bold text-lg">Masa {otherUser.table_number}</h1>
            <p className="text-gray-300 text-sm">
              {otherUser.user.gender === 'male' ? 'Erkek' : 'Kadın'} • {otherUser.user.age_range}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((msg, idx) => {
            const isMe = msg.sender_session_id === session.id;
            
            return (
              <div
                key={msg.id || idx}
                className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md px-4 py-3 rounded-2xl ${
                    isMe
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                      : 'bg-white/10 text-white'
                  }`}
                >
                  <p className="break-words">{msg.content}</p>
                  <p className={`text-xs mt-1 ${isMe ? 'text-purple-100' : 'text-gray-400'}`}>
                    {new Date(msg.created_at).toLocaleTimeString('tr-TR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          
          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white/10 backdrop-blur-lg border-t border-white/20 p-4">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                handleTyping();
              }}
              placeholder="Mesajınızı yazın..."
              className="flex-1 bg-white/10 text-white placeholder-gray-400 px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || sending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? '⏳' : '📤'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cafeAPI } from '../services/api';
import CoffeeRequestModal from '../components/CoffeeRequestModal';

const LobbyPage = () => {
  const [tables, setTables] = useState([]);
  const [cafeInfo, setCafeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [notification, setNotification] = useState(null);
  const { session, logout } = useAuth();
  const navigate = useNavigate();

  // Masaları yükle
  const loadTables = async () => {
    try {
      const response = await cafeAPI.getTables(session.cafe_id);
      setTables(response.data.tables);
      setCafeInfo(response.data.cafe);
      setError(null);
    } catch (err) {
      console.error('Load tables error:', err);
      setError('Masalar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!session) {
      navigate('/');
      return;
    }

    if (!session.user) {
      navigate('/profile-setup');
      return;
    }

    loadTables();

    // Her 5 saniyede bir güncelle
    const interval = setInterval(loadTables, 5000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleRequestSuccess = (result) => {
    if (result.type === 'match') {
      // MATCH!
      setNotification({
        type: 'success',
        message: `🎉 ${result.message}`,
        action: () => navigate(`/chat/${result.chatId}`)
      });
    } else {
      // Normal send
      setNotification({
        type: 'info',
        message: '✅ Kahve teklifi gönderildi!'
      });
    }
    
    // Masaları yenile
    loadTables();
    
    // 5 saniye sonra notification'ı kapat
    setTimeout(() => setNotification(null), 5000);
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

  const getGroupEmoji = (groupType) => {
    const emojis = {
      solo: '🧍',
      couple: '💑',
      friends: '👥'
    };
    return emojis[groupType] || '🧍';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-4 pb-20">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 shadow-xl border border-white/20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{cafeInfo?.name || 'helMisa'}</h1>
            <p className="text-gray-300 text-sm">Masa {session.table_number} • {tables.length} kişi online</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500/20 hover:bg-red-500/30 text-red-300 px-4 py-2 rounded-xl transition-all"
          >
            Çıkış
          </button>
        </div>
      </div>

      {/* Your Info */}
      <div className="max-w-6xl mx-auto mb-6">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-lg rounded-2xl p-4 border border-purple-500/30">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getVibeColor(session.user.vibe)} flex items-center justify-center text-2xl`}>
              {getVibeEmoji(session.user.vibe)}
            </div>
            <div className="flex-1">
              <div className="text-white font-bold">Sensin! (Masa {session.table_number})</div>
              <div className="text-gray-300 text-sm">
                {session.user.gender === 'male' ? 'Erkek' : session.user.gender === 'female' ? 'Kadın' : 'Diğer'} • {session.user.age_range} • {getGroupEmoji(session.user.group_type)} {session.user.group_type}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-bold text-white mb-4">Cafe'deki Diğer Masalar</h2>
        
        {error && (
          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
            <p className="text-red-300">{error}</p>
          </div>
        )}

        {tables.length === 0 ? (
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">
            <div className="text-6xl mb-4">👀</div>
            <h3 className="text-xl font-bold text-white mb-2">Henüz kimse yok</h3>
            <p className="text-gray-300">Başkaları geldiğinde burada görünecekler</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {tables.map((table) => (
              <div
                key={table.id}
                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:border-purple-500/50 transition-all cursor-pointer hover:transform hover:scale-105"
              >
                {/* Vibe Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getVibeColor(table.user.vibe)} flex items-center justify-center text-3xl shadow-lg`}>
                    {getVibeEmoji(table.user.vibe)}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-bold text-lg">Masa {table.table_number}</div>
                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${table.is_online ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                      <div className={`w-2 h-2 rounded-full ${table.is_online ? 'bg-green-400' : 'bg-gray-400'}`} />
                      {table.is_online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                </div>

                {/* User Info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <span>{table.user.gender === 'male' ? '👨' : table.user.gender === 'female' ? '👩' : '🧑'}</span>
                    <span>{table.user.age_range} yaş</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <span>{getGroupEmoji(table.user.group_type)}</span>
                    <span>
                      {table.user.group_type === 'solo' ? 'Yalnız' : table.user.group_type === 'couple' ? 'Çift' : 'Arkadaşlarla'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-300 text-sm">
                    <span>{getVibeEmoji(table.user.vibe)}</span>
                    <span className="capitalize">{table.user.vibe}</span>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  onClick={() => setSelectedUser(table)}
                  className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-lg"
                >
                  ☕ Kahve Teklif Et
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coffee Request Modal */}
      {selectedUser && (
        <CoffeeRequestModal
          targetUser={selectedUser}
          onClose={() => setSelectedUser(null)}
          onSuccess={handleRequestSuccess}
        />
      )}

      {/* Notification */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`p-4 rounded-xl shadow-2xl border ${
            notification.type === 'success' 
              ? 'bg-green-500/20 border-green-500/50' 
              : 'bg-blue-500/20 border-blue-500/50'
          }`}>
            <p className="text-white font-semibold">{notification.message}</p>
            {notification.action && (
              <button
                onClick={notification.action}
                className="mt-2 text-sm text-white underline"
              >
                Chat'e Git →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LobbyPage;

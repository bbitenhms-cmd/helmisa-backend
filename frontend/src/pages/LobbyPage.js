import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { cafeAPI } from '../services/api';

const LobbyPage = () => {
  const [tables, setTables] = useState([]);
  const [cafeInfo, setCafeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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
  }, [session, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
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
                {session.user.gender === 'male' ? 'Erkek' : session.user.gender === 'female' ? 'Kadın' : 'Diğer'} • \n                {session.user.age_range} • \n                {getGroupEmoji(session.user.group_type)} {session.user.group_type}\n              </div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      {/* Tables Grid */}\n      <div className="max-w-6xl mx-auto">\n        <h2 className="text-xl font-bold text-white mb-4">Cafe'deki Diğer Masalar</h2>\n        \n        {error && (\n          <div className="mb-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">\n            <p className="text-red-300">{error}</p>\n          </div>\n        )}\n\n        {tables.length === 0 ? (\n          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center border border-white/20">\n            <div className="text-6xl mb-4">👀</div>\n            <h3 className="text-xl font-bold text-white mb-2">Henüz kimse yok</h3>\n            <p className="text-gray-300">Başkaları geldiğinde burada görünecekler</p>\n          </div>\n        ) : (\n          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">\n            {tables.map((table) => (\n              <div\n                key={table.id}\n                className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-xl border border-white/20 hover:border-purple-500/50 transition-all cursor-pointer hover:transform hover:scale-105"\n              >\n                {/* Vibe Badge */}\n                <div className="flex items-center gap-3 mb-4">\n                  <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getVibeColor(table.user.vibe)} flex items-center justify-center text-3xl shadow-lg`}>\n                    {getVibeEmoji(table.user.vibe)}\n                  </div>\n                  <div className="flex-1">\n                    <div className="text-white font-bold text-lg">Masa {table.table_number}</div>\n                    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${table.is_online ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>\n                      <div className={`w-2 h-2 rounded-full ${table.is_online ? 'bg-green-400' : 'bg-gray-400'}`} />\n                      {table.is_online ? 'Online' : 'Offline'}\n                    </div>\n                  </div>\n                </div>\n\n                {/* User Info */}\n                <div className="space-y-2">\n                  <div className="flex items-center gap-2 text-gray-300 text-sm">\n                    <span>{table.user.gender === 'male' ? '👨' : table.user.gender === 'female' ? '👩' : '🧑'}</span>\n                    <span>{table.user.age_range} yaş</span>\n                  </div>\n                  <div className="flex items-center gap-2 text-gray-300 text-sm">\n                    <span>{getGroupEmoji(table.user.group_type)}</span>\n                    <span>\n                      {table.user.group_type === 'solo' ? 'Yalnız' : \n                       table.user.group_type === 'couple' ? 'Çift' : \n                       'Arkadaşlarla'}\n                    </span>\n                  </div>\n                  <div className="flex items-center gap-2 text-gray-300 text-sm">\n                    <span>{getVibeEmoji(table.user.vibe)}</span>\n                    <span className="capitalize">{table.user.vibe}</span>\n                  </div>\n                </div>\n\n                {/* Action Button */}\n                <button className="w-full mt-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-xl transition-all shadow-lg">\n                  ☕ Kahve Teklif Et\n                </button>\n              </div>\n            ))}\n          </div>\n        )}\n      </div>\n    </div>\n  );\n};\n\nexport default LobbyPage;

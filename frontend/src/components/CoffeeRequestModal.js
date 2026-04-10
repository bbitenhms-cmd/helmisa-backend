import React, { useState } from 'react';
import { requestAPI } from '../services/api';

const CoffeeRequestModal = ({ targetUser, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSendRequest = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await requestAPI.send(targetUser.id);
      
      if (response.data.status === 'matched') {
        // MATCH!
        onSuccess({
          type: 'match',
          message: response.data.message,
          chatId: response.data.chat_id
        });
      } else {
        // Normal request sent
        onSuccess({
          type: 'sent',
          message: response.data.message
        });
      }
      
      onClose();
    } catch (err) {
      console.error('Send request error:', err);
      setError(err.response?.data?.detail || 'Teklif gönderilemedi');
      setLoading(false);
    }
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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-purple-900 rounded-3xl p-8 max-w-md w-full shadow-2xl border border-white/20">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* User Info */}
        <div className="text-center mb-6">
          <div className={`w-24 h-24 mx-auto rounded-full bg-gradient-to-br ${getVibeColor(targetUser.user.vibe)} flex items-center justify-center text-5xl shadow-lg mb-4`}>
            {getVibeEmoji(targetUser.user.vibe)}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Masa {targetUser.table_number}</h2>
          <div className="flex items-center justify-center gap-2 text-gray-300">
            <span>{targetUser.user.gender === 'male' ? '👨' : targetUser.user.gender === 'female' ? '👩' : '🧑'}</span>
            <span>{targetUser.user.age_range}</span>
            <span>•</span>
            <span className="capitalize">{targetUser.user.vibe}</span>
          </div>
        </div>

        {/* Coffee Icon */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-3">☕</div>
          <h3 className="text-xl font-bold text-white mb-2">Kahve Teklif Et</h3>
          <p className="text-gray-300 text-sm">
            Bu kişiye kahve teklif etmek ister misiniz?
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all"
          >
            İptal
          </button>
          <button
            onClick={handleSendRequest}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-xl transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? 'Gönderiliyor...' : 'Gönder 💌'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoffeeRequestModal;

import React, { useState } from 'react';
import { requestAPI } from '../services/api';

const IncomingRequestModal = ({ request, onAccept, onReject }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAccept = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await requestAPI.accept(request.id);
      onAccept(response.data);
    } catch (err) {
      console.error('Accept error:', err);
      setError(err.response?.data?.detail || 'Kabul edilemedi');
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setError(null);

    try {
      await requestAPI.reject(request.id);
      onReject();
    } catch (err) {
      console.error('Reject error:', err);
      setError(err.response?.data?.detail || 'Reddedilemedi');
      setLoading(false);
    }
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-gradient-to-br from-purple-900 via-pink-900 to-purple-900 rounded-3xl p-8 max-w-sm w-full shadow-2xl border-2 border-pink-500/50 animate-scaleIn">
        {/* Coffee Animation */}
        <div className="text-center mb-6">
          <div className="text-8xl mb-4 animate-bounce">☕</div>
          <h2 className="text-3xl font-bold text-white mb-2">Kahve Teklifi!</h2>
          <div className="h-1 w-20 bg-gradient-to-r from-pink-500 to-purple-500 mx-auto rounded-full"></div>
        </div>

        {/* Sender Info */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6 border border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center text-4xl shadow-lg">
              {getVibeEmoji(request.from_user?.vibe || 'social')}
            </div>
            <div className="flex-1">
              <div className="text-white font-bold text-xl">Masa {request.from_table}</div>
              <div className="text-gray-300 text-sm">
                {request.from_user?.gender === 'male' ? '👨 Erkek' : '👩 Kadın'} • {request.from_user?.age_range}
              </div>
            </div>
          </div>
          <p className="text-gray-200 text-center text-sm">
            Size kahve ısmarlıyor! ☕✨
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-xl">
            <p className="text-red-300 text-sm text-center">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed text-lg"
          >
            {loading ? '⏳ İşleniyor...' : '✅ Kabul Et'}
          </button>
          <button
            onClick={handleReject}
            disabled={loading}
            className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-6 rounded-xl transition-all border border-white/30"
          >
            ❌ Reddet
          </button>
        </div>

        {/* Timer */}
        <p className="text-gray-400 text-xs text-center mt-4">
          ⏱️ Teklif 5 dakika içinde geçersiz olacak
        </p>
      </div>
    </div>
  );
};

export default IncomingRequestModal;

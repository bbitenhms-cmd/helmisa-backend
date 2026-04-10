import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProfileSetupPage = () => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    gender: '',
    age_range: '',
    group_type: '',
    vibe: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const { createProfile, session } = useAuth();

  const genderOptions = [
    { value: 'male', label: 'Erkek', icon: '👨' },
    { value: 'female', label: 'Kadın', icon: '👩' },
    { value: 'other', label: 'Diğer', icon: '🧑' }
  ];

  const ageOptions = [
    { value: '18-25', label: '18-25' },
    { value: '26-35', label: '26-35' },
    { value: '36-45', label: '36-45' },
    { value: '46+', label: '46+' }
  ];

  const groupOptions = [
    { value: 'solo', label: 'Yalnız', icon: '🧍' },
    { value: 'couple', label: 'Çift', icon: '💑' },
    { value: 'friends', label: 'Arkadaşlar', icon: '👥' }
  ];

  const vibeOptions = [
    { value: 'chill', label: 'Sakin', icon: '😌', color: 'from-blue-500 to-cyan-500' },
    { value: 'energetic', label: 'Enerjik', icon: '⚡', color: 'from-yellow-500 to-orange-500' },
    { value: 'romantic', label: 'Romantik', icon: '💕', color: 'from-pink-500 to-rose-500' },
    { value: 'social', label: 'Sosyal', icon: '🎉', color: 'from-purple-500 to-indigo-500' }
  ];

  const handleSelect = (field, value) => {
    setProfile({ ...profile, [field]: value });
    
    // Otomatik bir sonraki adıma geç
    setTimeout(() => {
      if (step < 4) {
        setStep(step + 1);
      }
    }, 300);
  };

  const handleSubmit = async () => {
    // Tüm alanlar dolu mu kontrol et
    if (!profile.gender || !profile.age_range || !profile.group_type || !profile.vibe) {
      setError('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createProfile(profile);
      navigate('/lobby');
    } catch (err) {
      console.error('Profile creation error:', err);
      setError(err.response?.data?.detail || 'Profil oluşturulamadı');
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Cinsiyetiniz?</h2>
            <div className="grid grid-cols-3 gap-4">
              {genderOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('gender', option.value)}
                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${
                    profile.gender === option.value
                      ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="text-4xl mb-2">{option.icon}</div>
                  <div className="text-white font-semibold">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Yaş aralığınız?</h2>
            <div className="grid grid-cols-2 gap-4">
              {ageOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('age_range', option.value)}
                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${
                    profile.age_range === option.value
                      ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="text-white font-bold text-xl">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Kimlerle geldiniz?</h2>
            <div className="grid grid-cols-3 gap-4">
              {groupOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('group_type', option.value)}
                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${
                    profile.group_type === option.value
                      ? 'bg-purple-500 shadow-lg shadow-purple-500/50'
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="text-4xl mb-2">{option.icon}</div>
                  <div className="text-white font-semibold">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-2xl font-bold text-white mb-6 text-center">Ruh haliniz?</h2>
            <div className="grid grid-cols-2 gap-4">
              {vibeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect('vibe', option.value)}
                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${
                    profile.vibe === option.value
                      ? `bg-gradient-to-br ${option.color} shadow-lg`
                      : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  <div className="text-4xl mb-2">{option.icon}</div>
                  <div className="text-white font-semibold">{option.label}</div>
                </button>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Profilini Oluştur</h1>
          <p className="text-gray-300">Masa {session?.table_number} • helMisa</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={`w-1/4 h-2 rounded-full mx-1 transition-all ${
                  s <= step ? 'bg-purple-500' : 'bg-white/20'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-gray-400 text-sm">Adım {step}/4</p>
        </div>

        {/* Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          {renderStep()}

          {/* Error */}
          {error && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex gap-4">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="flex-1 bg-white/10 text-white font-semibold py-3 px-6 rounded-xl hover:bg-white/20 transition-all"
              >
                Geri
              </button>
            )}
            {step === 4 && profile.vibe && (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"
              >
                {loading ? 'Kaydediliyor...' : 'Başlayalım! 🚀'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSetupPage;

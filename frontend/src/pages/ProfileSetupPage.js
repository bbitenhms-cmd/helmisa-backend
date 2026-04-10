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
              {genderOptions.map((option) => (\n                <button\n                  key={option.value}\n                  onClick={() => handleSelect('gender', option.value)}\n                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${\n                    profile.gender === option.value\n                      ? 'bg-purple-500 shadow-lg shadow-purple-500/50'\n                      : 'bg-white/10 hover:bg-white/20'\n                  }`}\n                >\n                  <div className="text-4xl mb-2">{option.icon}</div>\n                  <div className="text-white font-semibold">{option.label}</div>\n                </button>\n              ))}\n            </div>\n          </div>\n        );\n\n      case 2:\n        return (\n          <div>\n            <h2 className="text-2xl font-bold text-white mb-6 text-center">Yaş aralığınız?</h2>\n            <div className="grid grid-cols-2 gap-4">\n              {ageOptions.map((option) => (\n                <button\n                  key={option.value}\n                  onClick={() => handleSelect('age_range', option.value)}\n                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${\n                    profile.age_range === option.value\n                      ? 'bg-purple-500 shadow-lg shadow-purple-500/50'\n                      : 'bg-white/10 hover:bg-white/20'\n                  }`}\n                >\n                  <div className="text-white font-bold text-xl">{option.label}</div>\n                </button>\n              ))}\n            </div>\n          </div>\n        );\n\n      case 3:\n        return (\n          <div>\n            <h2 className="text-2xl font-bold text-white mb-6 text-center">Kimlerle geldiniz?</h2>\n            <div className="grid grid-cols-3 gap-4">\n              {groupOptions.map((option) => (\n                <button\n                  key={option.value}\n                  onClick={() => handleSelect('group_type', option.value)}\n                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${\n                    profile.group_type === option.value\n                      ? 'bg-purple-500 shadow-lg shadow-purple-500/50'\n                      : 'bg-white/10 hover:bg-white/20'\n                  }`}\n                >\n                  <div className="text-4xl mb-2">{option.icon}</div>\n                  <div className="text-white font-semibold">{option.label}</div>\n                </button>\n              ))}\n            </div>\n          </div>\n        );\n\n      case 4:\n        return (\n          <div>\n            <h2 className="text-2xl font-bold text-white mb-6 text-center">Ruh haliniz?</h2>\n            <div className="grid grid-cols-2 gap-4">\n              {vibeOptions.map((option) => (\n                <button\n                  key={option.value}\n                  onClick={() => handleSelect('vibe', option.value)}\n                  className={`p-6 rounded-2xl transition-all transform hover:scale-105 ${\n                    profile.vibe === option.value\n                      ? `bg-gradient-to-br ${option.color} shadow-lg`\n                      : 'bg-white/10 hover:bg-white/20'\n                  }`}\n                >\n                  <div className="text-4xl mb-2">{option.icon}</div>\n                  <div className="text-white font-semibold">{option.label}</div>\n                </button>\n              ))}\n            </div>\n          </div>\n        );\n\n      default:\n        return null;\n    }\n  };\n\n  return (\n    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">\n      <div className="max-w-lg w-full">\n        {/* Header */}\n        <div className="text-center mb-8">\n          <h1 className="text-4xl font-bold text-white mb-2">Profilini Oluştur</h1>\n          <p className="text-gray-300">Masa {session?.table_number} • helMisa</p>\n        </div>\n\n        {/* Progress Bar */}\n        <div className="mb-8">\n          <div className="flex justify-between mb-2">\n            {[1, 2, 3, 4].map((s) => (\n              <div\n                key={s}\n                className={`w-1/4 h-2 rounded-full mx-1 transition-all ${\n                  s <= step ? 'bg-purple-500' : 'bg-white/20'\n                }`}\n              />\n            ))}\n          </div>\n          <p className="text-center text-gray-400 text-sm">Adım {step}/4</p>\n        </div>\n\n        {/* Card */}\n        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">\n          {renderStep()}\n\n          {/* Error */}\n          {error && (\n            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">\n              <p className="text-red-300 text-sm">{error}</p>\n            </div>\n          )}\n\n          {/* Navigation */}\n          <div className="mt-8 flex gap-4">\n            {step > 1 && (\n              <button\n                onClick={() => setStep(step - 1)}\n                disabled={loading}\n                className="flex-1 bg-white/10 text-white font-semibold py-3 px-6 rounded-xl hover:bg-white/20 transition-all"\n              >\n                Geri\n              </button>\n            )}\n            {step === 4 && profile.vibe && (\n              <button\n                onClick={handleSubmit}\n                disabled={loading}\n                className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg disabled:opacity-50"\n              >\n                {loading ? 'Kaydediliyor...' : 'Başlayalım! 🚀'}\n              </button>\n            )}\n          </div>\n        </div>\n      </div>\n    </div>\n  );\n};\n\nexport default ProfileSetupPage;

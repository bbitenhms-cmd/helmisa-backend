import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const QRRedirectPage = () => {
  const { cafeId, tableNumber } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  useEffect(() => {
    const handleQRLogin = async () => {
      try {
        // Konum al
        let location = null;
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                timeout: 5000,
                enableHighAccuracy: true
              });
            });
            location = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
          } catch (geoError) {
            console.warn('Konum alınamadı:', geoError);
          }
        }

        // Login
        await login(cafeId, parseInt(tableNumber), location);
        
        // Profil oluşturma sayfasına yönlendir
        navigate('/profile-setup');
      } catch (err) {
        console.error('QR login error:', err);
        setError(err.response?.data?.detail || 'Giriş yapılamadı');
        setLoading(false);
      }
    };

    if (cafeId && tableNumber) {
      handleQRLogin();
    }
  }, [cafeId, tableNumber, login, navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-2xl font-bold text-white mb-4">Hata</h1>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 px-6 rounded-xl"
          >
            Ana Sayfaya Dön
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-6"></div>
        <h1 className="text-2xl font-bold text-white mb-2">Giriş yapılıyor...</h1>
        <p className="text-gray-300">Masa {tableNumber}</p>
      </div>
    </div>
  );
};

export default QRRedirectPage;

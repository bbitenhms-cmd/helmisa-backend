import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QrReader } from 'react-qr-reader';

// QR Reader constraints - component dışında tanımlandı (re-render optimizasyonu)
const QR_CONSTRAINTS = { facingMode: 'environment' };
const QR_STYLE = { width: '100%' };

const QRScanPage = () => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState(5); // Demo için masa seçimi
  const navigate = useNavigate();
  const { login } = useAuth();

  // QR kod okunduğunda
  const handleScan = async (result) => {
    if (result && !loading) {
      setLoading(true);
      setError(null);

      try {
        // QR format: "helmisa-{cafeId}-table-{tableNumber}"
        // Örnek: "helmisa-demo-cafe-001-table-5"
        const qrText = result.text;
        
        // Parse QR code
        const parts = qrText.split('-');
        const tableIndex = parts.indexOf('table');
        
        if (tableIndex === -1) {
          throw new Error('Geçersiz QR kod formatı');
        }

        const cafeId = parts.slice(1, tableIndex).join('-');
        const tableNumber = parseInt(parts[tableIndex + 1]);

        if (!cafeId || isNaN(tableNumber)) {
          throw new Error('QR kod okunamadı');
        }

        // Konum al (geolocation)
        let location = null;
        if (navigator.geolocation) {
          try {
            const position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
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
        await login(cafeId, tableNumber, location);

        // Profil oluşturma sayfasına yönlendir
        navigate('/profile-setup');
      } catch (err) {
        console.error('QR scan error:', err);
        setError(err.response?.data?.detail || err.message || 'QR kod okunamadı');
        setLoading(false);
        setScanning(false);
      }
    }
  };

  const handleError = (err) => {
    console.error('Camera error:', err);
    setError('Kamera açılamadı. Lütfen kamera iznini kontrol edin.');
    setScanning(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">helMisa</h1>
          <p className="text-gray-300 text-lg">Cafe'de tanışmanın yeni yolu</p>
        </div>

        {/* QR Scanner Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20">
          {!scanning ? (
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                <svg className="w-12 h-12 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">QR Kod Okut</h2>
              <p className="text-gray-300 mb-6">Masanızdaki QR kodu okutarak başlayın</p>
              <button
                onClick={() => setScanning(true)}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 px-6 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                Kamerayı Aç
              </button>
            </div>
          ) : (
            <div>
              <div className="mb-4">
                <QrReader
                  constraints={QR_CONSTRAINTS}
                  onResult={handleScan}
                  onError={handleError}
                  style={QR_STYLE}
                />
              </div>
              <p className="text-center text-gray-300 mb-4">
                {loading ? 'Giriş yapılıyor...' : 'QR kodu kameraya gösterin'}
              </p>
              {!loading && (
                <button
                  onClick={() => {
                    setScanning(false);
                    setError(null);
                  }}
                  className="w-full bg-gray-700 text-white font-semibold py-3 px-6 rounded-xl hover:bg-gray-600 transition-all"
                >
                  İptal
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-500/50 rounded-xl">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Demo Button (Test için) */}
        <div className="mt-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-white font-semibold mb-3 text-center">Demo Test</h3>
            <p className="text-gray-300 text-sm mb-4 text-center">QR kod olmadan test etmek için masa numaranızı seçin</p>
            
            {/* Masa Seçici */}
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Hangi masadasınız?
              </label>
              <select
                value={selectedTable}
                onChange={(e) => setSelectedTable(parseInt(e.target.value))}
                className="w-full bg-white/10 border border-white/20 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {[...Array(20)].map((_, i) => (
                  <option key={i + 1} value={i + 1} className="bg-gray-800">
                    Masa {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Demo Giriş Butonu */}
            <button
              onClick={async () => {
                setLoading(true);
                setError(null);
                try {
                  await login('demo-cafe-001', selectedTable, null);
                  navigate('/profile-setup');
                } catch (err) {
                  setError(err.response?.data?.detail || 'Giriş başarısız');
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 px-6 rounded-xl hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Giriş yapılıyor...' : `Masa ${selectedTable} olarak Giriş Yap`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRScanPage;
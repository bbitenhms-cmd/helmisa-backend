import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket, startHeartbeat, stopHeartbeat, getSocket } from '../services/socket';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incomingRequest, setIncomingRequest] = useState(null);
  const [matchNotification, setMatchNotification] = useState(null);

  // Socket event listener'larını kur
  useEffect(() => {
    if (!token) return;

    const socket = getSocket();
    if (!socket) return;

    // Kahve teklifi geldiğinde
    const handleCoffeeRequest = (data) => {
      console.log('☕ [AuthContext] Kahve teklifi geldi:', data);
      setIncomingRequest(data);
    };

    // Match olduğunda
    const handleMatchCreated = (data) => {
      console.log('🎉 [AuthContext] Match!', data);
      setMatchNotification({
        type: 'match',
        message: `🎉 ${data.message || 'Eşleşme gerçekleşti!'}`,
        chatId: data.chat_id
      });
    };

    socket.on('coffee_request', handleCoffeeRequest);
    socket.on('match_created', handleMatchCreated);

    return () => {
      socket.off('coffee_request', handleCoffeeRequest);
      socket.off('match_created', handleMatchCreated);
    };
  }, [token]);

  // Sayfa yüklendiğinde token varsa session'ı yükle
  useEffect(() => {
    const loadSession = async () => {
      const savedToken = localStorage.getItem('token');
      const savedSession = localStorage.getItem('session');

      if (savedToken && savedSession) {
        setToken(savedToken);
        setSession(JSON.parse(savedSession));
        
        // Socket bağlantısını başlat
        const socket = initSocket(savedToken);
        startHeartbeat();
        
        // Socket bağlandığında log
        socket.on('connect', () => {
          console.log('✅ [AuthContext] Socket connected:', socket.id);
        });
        
        socket.on('authenticated', (data) => {
          console.log('✅ [AuthContext] Socket authenticated:', data);
        });
      }
      
      setLoading(false);
    };

    loadSession();

    // Cleanup: sayfa kapanınca socket'i kapat
    return () => {
      stopHeartbeat();
      disconnectSocket();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR ile giriş
  const login = async (cafeId, tableNumber, location) => {
    try {
      const response = await authAPI.qrLogin({ 
        cafe_id: cafeId, 
        table_number: tableNumber,
        location: location 
      });
      
      const { session: newSession, token: newToken } = response.data;

      setSession(newSession);
      setToken(newToken);

      // Local storage'a kaydet
      localStorage.setItem('token', newToken);
      localStorage.setItem('session', JSON.stringify(newSession));

      // Socket bağlantısını başlat
      initSocket(newToken);
      startHeartbeat();

      return newSession;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Profil oluştur
  const createProfile = async (profileData) => {
    try {
      const response = await authAPI.createProfile(profileData);
      const { session: updatedSession } = response.data;

      setSession(updatedSession);
      localStorage.setItem('session', JSON.stringify(updatedSession));

      return updatedSession;
    } catch (error) {
      console.error('Create profile error:', error);
      throw error;
    }
  };

  // Çıkış
  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setSession(null);
      setToken(null);
      localStorage.removeItem('token');
      localStorage.removeItem('session');
      
      stopHeartbeat();
      disconnectSocket();
    }
  };

  const value = {
    session,
    token,
    loading,
    login,
    createProfile,
    logout,
    isAuthenticated: !!session,
    hasProfile: !!session?.user,
    incomingRequest,
    setIncomingRequest,
    matchNotification,
    setMatchNotification,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

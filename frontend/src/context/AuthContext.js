import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { initSocket, disconnectSocket, startHeartbeat, stopHeartbeat } from '../services/socket';

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

  // Sayfa yüklendiğinde token varsa session'ı yükle
  useEffect(() => {
    const loadSession = async () => {
      const savedToken = localStorage.getItem('token');
      const savedSession = localStorage.getItem('session');

      if (savedToken && savedSession) {
        setToken(savedToken);
        setSession(JSON.parse(savedSession));
        
        // Socket bağlantısını başlat
        initSocket(savedToken);
        startHeartbeat();
      }
      
      setLoading(false);
    };

    loadSession();

    // Cleanup: sayfa kapanınca socket'i kapat
    return () => {
      stopHeartbeat();
      disconnectSocket();
    };
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

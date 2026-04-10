import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import QRScanPage from './pages/QRScanPage';
import ProfileSetupPage from './pages/ProfileSetupPage';
import LobbyPage from './pages/LobbyPage';
import ChatPage from './pages/ChatPage';
import './App.css';

// Protected Route - giriş yapmış kullanıcılar için
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

// Profile Route - profil oluşturmuş kullanıcılar için
const ProfileRoute = ({ children }) => {
  const { hasProfile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Yükleniyor...</div>
      </div>
    );
  }

  return hasProfile ? children : <Navigate to="/profile-setup" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<QRScanPage />} />
      
      <Route
        path="/profile-setup"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />
      
      <Route
        path="/lobby"
        element={
          <ProtectedRoute>
            <ProfileRoute>
              <LobbyPage />
            </ProfileRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/chat/:chatId"
        element={
          <ProtectedRoute>
            <ProfileRoute>
              <ChatPage />
            </ProfileRoute>
          </ProtectedRoute>
        }
      />

      {/* 404 - Sayfa bulunamadı */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

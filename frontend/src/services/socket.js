import { io } from 'socket.io-client';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

let socket = null;

export const initSocket = (token) => {
  if (socket) {
    socket.disconnect();
  }

  console.log('🔌 [Socket] Initializing connection to', BACKEND_URL);

  socket = io(BACKEND_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('✅ [Socket] Connected! Socket ID:', socket.id);
    console.log('🔐 [Socket] Sending authenticate event with token...');
    socket.emit('authenticate', { token });
  });

  socket.on('disconnect', () => {
    console.log('❌ [Socket] Disconnected');
  });

  socket.on('authenticated', (data) => {
    if (data.success) {
      console.log('✅ [Socket] Authentication SUCCESS!', data);
    } else {
      console.error('❌ [Socket] Authentication FAILED!', data);
    }
  });
  
  socket.on('coffee_request', (data) => {
    console.log('☕ [Socket] Coffee request event received!', data);
  });
  
  socket.on('match_created', (data) => {
    console.log('🎉 [Socket] Match created event received!', data);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// Heartbeat - her 30 saniyede bir gönder
let heartbeatInterval = null;

export const startHeartbeat = () => {
  if (heartbeatInterval) return;

  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('heartbeat', { timestamp: new Date().toISOString() });
    }
  }, 30000); // 30 saniye
};

export const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

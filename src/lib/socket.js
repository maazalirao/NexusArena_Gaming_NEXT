import { io } from 'socket.io-client';

// Define a singleton socket instance
let socket;

export const initializeSocket = async () => {
  if (socket) return socket;
  
  // Only create the socket on the client side
  if (typeof window !== 'undefined') {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000', {
      path: '/api/socket',
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    
    socket.on('connect', () => {
      console.log('Socket connected', socket.id);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
  }
  
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error('Socket not initialized! Call initializeSocket first.');
  }
  return socket;
};

export default { initializeSocket, getSocket }; 
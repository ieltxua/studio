import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import type { WebSocketEvent } from '@/types';

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  subscribe: (event: string, callback: (data: any) => void) => void;
  unsubscribe: (event: string, callback: (data: any) => void) => void;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Skip WebSocket in mock mode
    if (import.meta.env.VITE_USE_MOCK_DATA === 'true') {
      setIsConnected(false);
      return;
    }

    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      const newSocket = io('http://localhost:8080', {
        auth: {
          token,
        },
      });

      newSocket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
      }
    }
  }, [isAuthenticated]);

  const subscribe = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const unsubscribe = (event: string, callback: (data: any) => void) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const value = {
    socket,
    isConnected,
    subscribe,
    unsubscribe,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};
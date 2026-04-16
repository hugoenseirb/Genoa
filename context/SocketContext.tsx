import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = Constants.expoConfig?.extra?.socketUrl as string | undefined;

type SocketContextType = {
  socket: Socket | null;
};

const SocketContext = createContext<SocketContextType>({ socket: null });

export function SocketProvider({ children }: { children: ReactNode }) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!SOCKET_URL) return;

    async function connect() {
      const token = await AsyncStorage.getItem('token');
      if (!token) return;

      const socket = io(SOCKET_URL as string, {
        auth: { token },
        transports: ['websocket'],
      });

      socket.on('connect_error', (err) => {
        console.warn('Socket erreur :', err.message);
      });

      socketRef.current = socket;
    }

    connect();

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

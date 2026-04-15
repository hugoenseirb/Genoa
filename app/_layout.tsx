import { Stack } from 'expo-router';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SocketProvider>
    </AuthProvider>
  );
}
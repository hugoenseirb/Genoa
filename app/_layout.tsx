import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/context/AuthContext';
import { SocketProvider } from '@/context/SocketContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SocketProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SocketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

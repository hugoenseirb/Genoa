import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type AuthContextType = {
  token: string | null;
  isLoading: boolean;
  login: (fakeToken: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadToken() {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        setToken(savedToken);
      } catch (error) {
        console.log('Erreur chargement token :', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadToken();
  }, []);

  async function login(fakeToken: string) {
    await AsyncStorage.setItem('token', fakeToken);
    setToken(fakeToken);
  }

  async function logout() {
    await AsyncStorage.removeItem('token');
    setToken(null);
  }

  return (
    <AuthContext.Provider value={{ token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth doit être utilisé dans AuthProvider');
  }

  return context;
}
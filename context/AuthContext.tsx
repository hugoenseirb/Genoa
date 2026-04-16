import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type AuthUser = {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
};

type AuthContextType = {
  token: string | null;
  user: AuthUser | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSession() {
      try {
        const [savedToken, savedUser] = await Promise.all([
          AsyncStorage.getItem('token'),
          AsyncStorage.getItem('user'),
        ]);
        setToken(savedToken);
        setUser(savedUser ? JSON.parse(savedUser) : null);
      } catch {
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  async function login(token: string, user: AuthUser) {
    await Promise.all([
      AsyncStorage.setItem('token', token),
      AsyncStorage.setItem('user', JSON.stringify(user)),
    ]);
    setToken(token);
    setUser(user);
  }

  async function logout() {
    await Promise.all([
      AsyncStorage.removeItem('token'),
      AsyncStorage.removeItem('user'),
    ]);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth doit etre utilise dans AuthProvider');
  }
  return context;
}

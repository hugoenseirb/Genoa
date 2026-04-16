import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
} from 'react-native';

import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { registerRequest } from '@/services/auth';
import ScreenWrapper from '@/components/ScreenWrapper';

export default function RegisterScreen() {
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !password.trim()) {
        Alert.alert('Erreur', 'Remplis tous les champs.');
        return;
    }

    try {
        setLoading(true);
      const data = await registerRequest(email, password, username);

      if (data.token && data.user) {
        await login(data.token, data.user);
        router.replace('/(tabs)');
        return;
      }

      Alert.alert(
        'Compte créé',
        data.message || 'En attente de validation par un admin'
      );
      router.replace('/login');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor="#888"
        value={username}
        onChangeText={setUsername}
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#888"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <Pressable
        style={({ pressed }) => [
            styles.button,
            loading && styles.buttonDisabled,
            pressed && { opacity: 0.8 },
        ]}
        onPress={handleRegister}
        disabled={loading}
        >
        <Text style={styles.buttonText}>
            {loading ? 'Création...' : "S'inscrire"}
        </Text>
      </Pressable>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 30,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 14,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  link: {
    marginTop: 18,
    textAlign: 'center',
    color: '#93C5FD',
    fontSize: 15,
  },
});
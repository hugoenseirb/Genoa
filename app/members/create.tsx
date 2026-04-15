import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

export default function CreateMemberScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Remplis prénom et nom');
      return;
    }

    try {
      setLoading(true);

        const token = await AsyncStorage.getItem('token');

        const response = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
        }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Erreur création');
      }

      router.replace('/members');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ajouter un membre</Text>

      <TextInput
        style={styles.input}
        placeholder="Prénom"
        placeholderTextColor="#888"
        value={firstName}
        onChangeText={setFirstName}
      />

      <TextInput
        style={styles.input}
        placeholder="Nom"
        placeholderTextColor="#888"
        value={lastName}
        onChangeText={setLastName}
      />

      <Pressable
        style={[styles.button, loading && styles.disabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Création...' : 'Créer'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

const GENDERS = ['male', 'female', 'other', 'unknown'] as const;
const GENDER_LABELS: Record<string, string> = {
  male: 'Homme',
  female: 'Femme',
  other: 'Autre',
  unknown: 'Inconnu',
};

export default function CreateMemberScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<string>('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Remplis prénom et nom');
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');

      const body: Record<string, string> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
      };
      if (birthDate.trim()) body.birth_date = birthDate.trim();
      if (birthPlace.trim()) body.birth_place = birthPlace.trim();
      if (deathDate.trim()) body.death_date = deathDate.trim();

      const response = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ajouter un membre</Text>

      <Text style={styles.label}>Prénom *</Text>
      <TextInput
        style={styles.input}
        placeholder="Prénom"
        placeholderTextColor="#64748B"
        value={firstName}
        onChangeText={setFirstName}
      />

      <Text style={styles.label}>Nom *</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom"
        placeholderTextColor="#64748B"
        value={lastName}
        onChangeText={setLastName}
      />

      <Text style={styles.label}>Genre</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <Pressable
            key={g}
            style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
            onPress={() => setGender(g)}
          >
            <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
              {GENDER_LABELS[g]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Date de naissance (AAAA-MM-JJ)</Text>
      <TextInput
        style={styles.input}
        placeholder="ex : 1985-03-12"
        placeholderTextColor="#64748B"
        value={birthDate}
        onChangeText={setBirthDate}
        keyboardType="numeric"
      />

      <Text style={styles.label}>Lieu de naissance</Text>
      <TextInput
        style={styles.input}
        placeholder="ex : Paris, France"
        placeholderTextColor="#64748B"
        value={birthPlace}
        onChangeText={setBirthPlace}
      />

      <Text style={styles.label}>Date de décès (AAAA-MM-JJ)</Text>
      <TextInput
        style={styles.input}
        placeholder="Laisser vide si vivant"
        placeholderTextColor="#64748B"
        value={deathDate}
        onChangeText={setDeathDate}
        keyboardType="numeric"
      />

      <Pressable
        style={[styles.button, loading && styles.disabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Création...' : 'Créer le membre'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
  },
  genderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
    flexWrap: 'wrap',
  },
  genderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  genderBtnActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  genderText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  genderTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});
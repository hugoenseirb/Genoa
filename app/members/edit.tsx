import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('unknown');
  const [birthDate, setBirthDate] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [deathDate, setDeathDate] = useState('');
  const [deathPlace, setDeathPlace] = useState('');
  const [notesPublic, setNotesPublic] = useState('');

  useEffect(() => {
    if (id) fetchMember();
  }, [id]);

  async function fetchMember() {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/members/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur chargement');

      setFirstName(data.first_name ?? '');
      setLastName(data.last_name ?? '');
      setGender(data.gender ?? 'unknown');
      setBirthDate(data.birth_date ? data.birth_date.split('T')[0] : '');
      setBirthPlace(data.birth_place ?? '');
      setDeathDate(data.death_date ? data.death_date.split('T')[0] : '');
      setDeathPlace(data.death_place ?? '');
      setNotesPublic(data.notes_public ?? '');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Erreur', 'Prenom et nom sont requis');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');

      const body: Record<string, string | boolean> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
      };
      if (birthDate.trim()) body.birth_date = birthDate.trim();
      if (birthPlace.trim()) body.birth_place = birthPlace.trim();
      if (deathDate.trim()) body.death_date = deathDate.trim();
      if (deathPlace.trim()) body.death_place = deathPlace.trim();
      if (notesPublic.trim()) body.notes_public = notesPublic.trim();

      const response = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur modification');

      Alert.alert('Succes', 'Membre mis a jour');
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Modifier le membre</Text>

      <Text style={styles.label}>Prenom *</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Nom *</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholderTextColor="#64748B"
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
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="ex : 1985-03-12"
        placeholderTextColor="#64748B"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Lieu de naissance</Text>
      <TextInput
        style={styles.input}
        value={birthPlace}
        onChangeText={setBirthPlace}
        placeholder="ex : Paris, France"
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Date de deces (AAAA-MM-JJ)</Text>
      <TextInput
        style={styles.input}
        value={deathDate}
        onChangeText={setDeathDate}
        placeholder="Laisser vide si vivant"
        placeholderTextColor="#64748B"
        keyboardType="numeric"
      />

      <Text style={styles.label}>Lieu de deces</Text>
      <TextInput
        style={styles.input}
        value={deathPlace}
        onChangeText={setDeathPlace}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notesPublic}
        onChangeText={setNotesPublic}
        multiline
        numberOfLines={4}
        placeholderTextColor="#64748B"
      />

      <Pressable
        style={[styles.button, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F1A' },
  title: { color: 'white', fontSize: 26, fontWeight: '700', marginBottom: 24 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  genderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
  },
  genderBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  genderText: { color: '#94A3B8', fontSize: 14 },
  genderTextActive: { color: 'white', fontWeight: '600' },
  button: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  Alert,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  gender?: string;
  birth_date?: string;
};

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  async function fetchMember() {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/members/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur chargement membre');
      }

      setMember(data);
    } catch (error) {
      console.error('Erreur fetch member:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchMember();
  }, [id]);

  function confirmDelete() {
    Alert.alert(
      'Supprimer le membre',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: handleDelete },
      ]
    );
  }

  async function handleDelete() {
    try {
      setDeleting(true);

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/members/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.message || 'Erreur suppression membre');
      }

      Alert.alert('Succès', 'Membre supprimé');
      router.replace('/members');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!member) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Membre introuvable</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {member.first_name} {member.last_name}
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Genre</Text>
        <Text style={styles.value}>{member.gender || 'Non renseigné'}</Text>

        <Text style={styles.label}>Date de naissance</Text>
        <Text style={styles.value}>
          {member.birth_date || 'Non renseignée'}
        </Text>
      </View>

      <Pressable
        style={styles.button}
        onPress={() => router.push(`/relations/create?memberId=${member.id}`)}
      >
        <Text style={styles.buttonText}>Ajouter une relation</Text>
      </Pressable>

      <Pressable
        style={[styles.button, styles.deleteButton, deleting && styles.buttonDisabled]}
        onPress={confirmDelete}
        disabled={deleting}
      >
        <Text style={styles.buttonText}>
          {deleting ? 'Suppression...' : 'Supprimer le membre'}
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
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 10,
  },
  value: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0B0F1A',
  },
  error: {
    color: 'white',
    textAlign: 'center',
  },
});
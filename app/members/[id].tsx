import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Constants from 'expo-constants';

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

  async function fetchMember() {
    try {
      const response = await fetch(`${API_URL}/members/${id}`);
      const data = await response.json();
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
        onPress={() =>
          router.push(`/relations/create?memberId=${member.id}`)
        }
      >
        <Text style={styles.buttonText}>Ajouter une relation</Text>
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
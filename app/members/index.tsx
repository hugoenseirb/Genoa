import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Member = {
  id: string;
  first_name: string;
  last_name: string;
};

const API_URL = Constants.expoConfig?.extra?.apiUrl;

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchMembers() {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Erreur fetch members:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  function renderItem({ item }: { item: Member }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/members/${item.id}`)}
      >
        <Text style={styles.name}>
          {item.first_name} {item.last_name}
        </Text>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Membres</Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Pressable
        style={styles.button}
        onPress={() => router.push('/members/create')}
      >
        <Text style={styles.buttonText}>+ Ajouter un membre</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    paddingHorizontal: 16,
    paddingTop: 40,
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
    marginBottom: 12,
  },
  name: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
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
});
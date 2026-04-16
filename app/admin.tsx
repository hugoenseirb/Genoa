import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import ScreenWrapper from '@/components/ScreenWrapper';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type User = {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
};

export default function AdminScreen() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  if (user && user.role !== 'admin') {
    return (
      <ScreenWrapper>
        <View style={styles.loader}>
          <Text style={{ color: '#DC2626', fontSize: 16, textAlign: 'center' }}>
            Acces refuse. Vous devez etre administrateur.
          </Text>
          <Pressable
            style={{ marginTop: 20, padding: 14, backgroundColor: '#1E293B', borderRadius: 10 }}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={{ color: 'white', textAlign: 'center' }}>Retour</Text>
          </Pressable>
        </View>
      </ScreenWrapper>
    );
  }

  async function fetchPendingUsers() {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/users/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur chargement utilisateurs');
      }

      if (!Array.isArray(data)) {
        throw new Error("La réponse users n'est pas une liste");
      }

      setUsers(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  async function handleApprove(userId: string) {
    try {
      setActionLoadingId(userId);

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/users/${userId}/approve`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur validation utilisateur');
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleDelete(userId: string) {
    return new Promise<void>((resolve) => {
      Alert.alert(
        'Supprimer cet utilisateur ?',
        'Cette action est irréversible.',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve() },
          { text: 'Supprimer', style: 'destructive', onPress: () => doDelete(userId).then(resolve) },
        ]
      );
    });
  }

  async function doDelete(userId: string) {
    try {
      setActionLoadingId(userId);

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let data: any = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        throw new Error(data?.message || 'Erreur suppression utilisateur');
      }

      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setActionLoadingId(null);
    }
  }

  function renderItem({ item }: { item: User }) {
    const isLoadingThisUser = actionLoadingId === item.id;

    return (
      <View style={styles.card}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.email}>{item.email}</Text>
        <Text style={styles.status}>Rôle : {item.role}</Text>
        <Text style={styles.status}>Statut : {item.status}</Text>

        <View style={styles.row}>
          <Pressable
            style={[
              styles.button,
              styles.approveButton,
              isLoadingThisUser && styles.disabled,
            ]}
            onPress={() => handleApprove(item.id)}
            disabled={isLoadingThisUser}
          >
            <Text style={styles.buttonText}>Accepter</Text>
          </Pressable>

          <Pressable
            style={[
              styles.button,
              styles.deleteButton,
              isLoadingThisUser && styles.disabled,
            ]}
            onPress={() => handleDelete(item.id)}
            disabled={isLoadingThisUser}
          >
            <Text style={styles.buttonText}>Supprimer</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <ScreenWrapper>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Administration</Text>
        <Text style={styles.subtitle}>Utilisateurs en attente</Text>

        {users.length === 0 ? (
          <Text style={styles.empty}>Aucun utilisateur pending</Text>
        ) : (
          <FlatList
            data={users}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 20,
  },
  empty: {
    color: '#CBD5E1',
    fontSize: 16,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  username: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  email: {
    color: '#CBD5E1',
    fontSize: 14,
    marginBottom: 6,
  },
  status: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#059669',
  },
  deleteButton: {
    backgroundColor: '#DC2626',
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});

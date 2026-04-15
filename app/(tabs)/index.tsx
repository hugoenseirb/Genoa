import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function HomeScreen() {
  const { logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>GENOA</Text>
      <Text style={styles.subtitle}>Gestion d’arbre généalogique</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Accueil</Text>
        <Text style={styles.description}>
          Choisis une action pour commencer.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/members')}
        >
          <Text style={styles.buttonText}>Voir les membres</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/members/create')}
        >
          <Text style={styles.buttonText}>Ajouter un membre</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push('/relations/create')}
        >
          <Text style={styles.buttonText}>Ajouter une relation</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.adminButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={() => router.push('/admin')}
        >
          <Text style={styles.buttonText}>Administration</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.button,
            styles.logoutButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleLogout}
        >
          <Text style={styles.buttonText}>Se déconnecter</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 32,
  },
  card: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 20,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    color: '#CBD5E1',
    fontSize: 15,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  adminButton: {
    backgroundColor: '#7C3AED',
  },
  logoutButton: {
    backgroundColor: '#DC2626',
    marginBottom: 0,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/context/AuthContext';
import ScreenWrapper from '@/components/ScreenWrapper';
import { colors, shared } from '@/constants/sharedStyles';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type UserProfile = {
  id: string;
  email: string;
  username: string;
  role: string;
  status: string;
  created_at: string;
};

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrateur',
  editor: 'Éditeur',
  reader: 'Lecteur',
};

const ROLE_COLORS: Record<string, string> = {
  admin: '#DC2626',
  editor: '#059669',
  reader: '#2563EB',
};

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  async function fetchProfile() {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur chargement profil');
      }

      setProfile(data.user ?? data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfile();
  }, []);

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Confirmer la déconnexion ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
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

  const roleColor = profile ? (ROLE_COLORS[profile.role] ?? '#64748B') : '#64748B';
  const roleLabel = profile ? (ROLE_LABELS[profile.role] ?? profile.role) : '';

  const joinDate = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <ScreenWrapper noBottomInset>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Mon profil</Text>

        {profile ? (
          <>
            <View style={styles.card}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarLetter}>
                  {profile.username.charAt(0).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.username}>{profile.username}</Text>
              <Text style={styles.email}>{profile.email}</Text>
              <View style={[styles.roleBadge, { backgroundColor: roleColor + '22', borderColor: roleColor }]}>
                <Text style={[styles.roleText, { color: roleColor }]}>{roleLabel}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <InfoRow label="Statut" value={profile.status === 'active' ? 'Actif' : profile.status} />
              {joinDate && <InfoRow label="Membre depuis" value={joinDate} />}
            </View>

            {profile.role === 'admin' && (
              <Pressable
                style={styles.adminBtn}
                onPress={() => router.push('/admin')}
              >
                <Text style={styles.adminBtnText}>Espace Administration</Text>
              </Pressable>
            )}
          </>
        ) : (
          <Text style={styles.errorText}>Profil introuvable</Text>
        )}

        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </Pressable>
      </ScrollView>
    </ScreenWrapper>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  loader: shared.loader,
  title: { color: colors.textPrimary, fontSize: 30, fontWeight: '700', marginBottom: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 24, alignItems: 'center', marginBottom: 16 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarLetter: { color: colors.textPrimary, fontSize: 32, fontWeight: '700' },
  username: { color: colors.textPrimary, fontSize: 22, fontWeight: '700', marginBottom: 4 },
  email: { color: colors.textMuted, fontSize: 15, marginBottom: 12 },
  roleBadge: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  roleText: { fontSize: 13, fontWeight: '600' },
  infoCard: { backgroundColor: colors.surface, borderRadius: 12, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.bg },
  infoLabel: { color: colors.textDisabled, fontSize: 14 },
  infoValue: { color: colors.textPrimary, fontSize: 14, fontWeight: '500' },
  adminBtn: { backgroundColor: '#7C3AED', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  adminBtnText: { color: colors.textPrimary, fontWeight: '600', fontSize: 15 },
  logoutBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger, padding: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  logoutText: { color: colors.danger, fontWeight: '600', fontSize: 15 },
  errorText: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
});

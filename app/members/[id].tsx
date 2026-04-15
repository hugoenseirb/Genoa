import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  ScrollView,
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
  death_date?: string;
  birth_place?: string;
  notes_public?: string;
};

type Relation = {
  id: string;
  type: 'couple' | 'parent_child';
  member_a_id: string;
  member_b_id: string;
  member_a_first_name: string;
  member_a_last_name: string;
  member_b_first_name: string;
  member_b_last_name: string;
  filiation_type?: string;
  union_date?: string;
  separation_date?: string;
};

const FILIATION_LABELS: Record<string, string> = {
  biological: 'Biologique',
  adopted: 'Adopte(e)',
  unknown: 'Inconnu',
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Non renseignee';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function MemberDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const memberId = Array.isArray(id) ? id[0] : id;

  const [member, setMember] = useState<Member | null>(null);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletingRelId, setDeletingRelId] = useState<string | null>(null);
  const [confirmRelId, setConfirmRelId] = useState<string | null>(null);

  async function fetchAll() {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [memberRes, relationsRes] = await Promise.all([
        fetch(`${API_URL}/members/${memberId}`, { headers }),
        fetch(`${API_URL}/relations?memberId=${memberId}`, { headers }),
      ]);

      const memberData = await memberRes.json();
      const relationsData = await relationsRes.json();

      if (!memberRes.ok) throw new Error(memberData.message || 'Erreur chargement membre');

      setMember(memberData);
      setRelations(Array.isArray(relationsData) ? relationsData : []);
    } catch (error) {
      console.error('Erreur fetch:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (memberId) fetchAll();
  }, [memberId]);

  async function handleDeleteMember() {
    setDeleting(true);
    setConfirmDelete(false);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/members/${memberId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 204 || response.ok) {
        router.replace('/members');
        return;
      }
      let message = `Erreur ${response.status}`;
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch {}
      Alert.alert('Erreur', message);
    } catch (error) {
      Alert.alert('Erreur reseau', String(error));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDeleteRelation(relId: string) {
    setDeletingRelId(relId);
    setConfirmRelId(null);
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/relations/${relId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.status === 204 || response.ok) {
        setRelations((prev) => prev.filter((r) => String(r.id) !== String(relId)));
        return;
      }
      let message = `Erreur ${response.status}`;
      try {
        const data = await response.json();
        if (data?.message) message = data.message;
      } catch {}
      Alert.alert('Erreur', message);
    } catch (error) {
      Alert.alert('Erreur reseau', String(error));
    } finally {
      setDeletingRelId(null);
    }
  }

  function getOtherMemberName(rel: Relation): string {
    if (rel.member_a_id === memberId) {
      return `${rel.member_b_first_name} ${rel.member_b_last_name}`;
    }
    return `${rel.member_a_first_name} ${rel.member_a_last_name}`;
  }

  function getRelationLabel(rel: Relation): string {
    if (rel.type === 'couple') return 'Conjoint(e)';
    const isParent = rel.member_a_id === memberId;
    const base = isParent ? 'Parent de' : 'Enfant de';
    const filiation = rel.filiation_type
      ? ` (${FILIATION_LABELS[rel.filiation_type] ?? rel.filiation_type})`
      : '';
    return `${base}${filiation}`;
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
      <View style={styles.loader}>
        <Text style={styles.error}>Membre introuvable</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>
        {member.first_name} {member.last_name}
      </Text>

      {/* Infos */}
      <View style={styles.card}>
        <InfoRow label="Genre" value={member.gender || 'Non renseigne'} />
        <InfoRow label="Date de naissance" value={formatDate(member.birth_date)} />
        {member.birth_place ? <InfoRow label="Lieu de naissance" value={member.birth_place} /> : null}
        {member.death_date ? <InfoRow label="Date de deces" value={formatDate(member.death_date)} /> : null}
        {member.notes_public ? <InfoRow label="Notes" value={member.notes_public} /> : null}
      </View>

      {/* Relations */}
      <Text style={styles.sectionTitle}>Relations ({relations.length})</Text>

      {relations.length === 0 ? (
        <Text style={styles.empty}>Aucune relation enregistree</Text>
      ) : (
        relations.map((rel) => (
          <View key={rel.id} style={styles.relationCard}>
            <View style={styles.relationInfo}>
              <Text style={styles.relationOther}>{getOtherMemberName(rel)}</Text>
              <Text style={styles.relationLabel}>{getRelationLabel(rel)}</Text>
            </View>

            {deletingRelId === rel.id ? (
              <View style={styles.deleteRelBtn}>
                <Text style={styles.deleteRelText}>...</Text>
              </View>
            ) : confirmRelId === rel.id ? (
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.deleteRelBtn, { backgroundColor: '#DC2626' }]}
                  onPress={() => handleDeleteRelation(rel.id)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteRelText}>Oui</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.deleteRelBtn, { backgroundColor: '#334155' }]}
                  onPress={() => setConfirmRelId(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteRelText}>Non</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.deleteRelBtn}
                onPress={() => setConfirmRelId(rel.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteRelText}>Sup.</Text>
              </TouchableOpacity>
            )}
          </View>
        ))
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.editButton]}
          onPress={() => router.push(`/members/edit?id=${member.id}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Modifier</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push(`/relations/create?memberId=${member.id}`)}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Ajouter une relation</Text>
        </TouchableOpacity>

        {confirmDelete ? (
          <View style={styles.confirmRow}>
            <Text style={styles.confirmText}>Supprimer definitivement ?</Text>
            <View style={styles.confirmBtns}>
              <TouchableOpacity
                style={[styles.button, styles.deleteButton, { flex: 1, marginBottom: 0 }]}
                onPress={handleDeleteMember}
                disabled={deleting}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>{deleting ? '...' : 'Confirmer'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1, marginBottom: 0, backgroundColor: '#334155' }]}
                onPress={() => setConfirmDelete(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={() => setConfirmDelete(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Supprimer le membre</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  content: { padding: 20, paddingBottom: 100 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F1A' },
  title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 20 },
  card: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, marginBottom: 20 },
  infoRow: { marginBottom: 10 },
  label: { color: '#94A3B8', fontSize: 12 },
  value: { color: 'white', fontSize: 15, fontWeight: '500', marginTop: 2 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: '700', marginBottom: 12 },
  empty: { color: '#64748B', fontSize: 14, marginBottom: 20 },
  relationCard: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  relationInfo: { flex: 1, marginRight: 10 },
  relationOther: { color: 'white', fontSize: 15, fontWeight: '600' },
  relationLabel: { color: '#94A3B8', fontSize: 12, marginTop: 3 },
  deleteRelBtn: {
    backgroundColor: '#7F1D1D',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteRelText: { color: '#FCA5A5', fontSize: 13, fontWeight: '600' },
  actions: { marginTop: 8 },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  editButton: { backgroundColor: '#059669' },
  deleteButton: { backgroundColor: '#DC2626' },
  buttonText: { color: 'white', fontWeight: '600' },
  error: { color: 'white' },
  confirmRow: { marginBottom: 12 },
  confirmText: { color: '#FCA5A5', fontSize: 14, marginBottom: 10, textAlign: 'center' },
  confirmBtns: { flexDirection: 'row', gap: 10 },
});

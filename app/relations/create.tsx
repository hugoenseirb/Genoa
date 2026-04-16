import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '@/components/ScreenWrapper';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type Member = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function CreateRelationScreen() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [memberA, setMemberA] = useState(memberId || '');
  const [memberB, setMemberB] = useState('');
  const [type, setType] = useState<'couple' | 'parent_child'>('couple');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur chargement membres');
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function handleCreate() {
    if (!memberA || !memberB) {
      Alert.alert('Erreur', 'Selectionne deux membres.');
      return;
    }
    if (memberA === memberB) {
      Alert.alert('Erreur', 'Un membre ne peut pas etre en relation avec lui-meme.');
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');

      const body =
        type === 'couple'
          ? { type: 'couple', member_a_id: memberA, member_b_id: memberB }
          : { type: 'parent_child', member_a_id: memberA, member_b_id: memberB, filiation_type: 'biological' };

      const response = await fetch(`${API_URL}/relations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur creation relation');

      Alert.alert('Succes', 'Relation creee');
      router.back();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setSaving(false);
    }
  }

  function memberName(id: string) {
    const m = members.find((m) => m.id === id);
    return m ? `${m.first_name} ${m.last_name}` : 'Non selectionne';
  }

  if (loadingMembers) {
    return (
      <ScreenWrapper>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper noBottomInset>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ajouter une relation</Text>

      <Text style={styles.label}>Type de relation</Text>
      <View style={styles.row}>
        <Pressable
          style={[styles.typeBtn, type === 'couple' && styles.typeBtnActive]}
          onPress={() => setType('couple')}
        >
          <Text style={[styles.typeBtnText, type === 'couple' && styles.typeBtnTextActive]}>
            Couple
          </Text>
        </Pressable>
        <Pressable
          style={[styles.typeBtn, type === 'parent_child' && styles.typeBtnActive]}
          onPress={() => setType('parent_child')}
        >
          <Text style={[styles.typeBtnText, type === 'parent_child' && styles.typeBtnTextActive]}>
            Parent / Enfant
          </Text>
        </Pressable>
      </View>

      <Text style={styles.label}>
        {type === 'couple' ? 'Membre 1' : 'Parent'}
        {memberA ? ` — ${memberName(memberA)}` : ''}
      </Text>
      <View style={styles.memberList}>
        {members.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.memberRow, memberA === m.id && styles.memberRowSelected]}
            onPress={() => setMemberA(m.id)}
          >
            <Text style={[styles.memberText, memberA === m.id && styles.memberTextSelected]}>
              {m.first_name} {m.last_name}
            </Text>
            {memberA === m.id && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>
        {type === 'couple' ? 'Membre 2' : 'Enfant'}
        {memberB ? ` — ${memberName(memberB)}` : ''}
      </Text>
      <View style={styles.memberList}>
        {members.map((m) => (
          <Pressable
            key={m.id}
            style={[styles.memberRow, memberB === m.id && styles.memberRowSelected]}
            onPress={() => setMemberB(m.id)}
          >
            <Text style={[styles.memberText, memberB === m.id && styles.memberTextSelected]}>
              {m.first_name} {m.last_name}
            </Text>
            {memberB === m.id && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[styles.button, saving && styles.disabled]}
        onPress={handleCreate}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? 'Creation...' : 'Creer la relation'}
        </Text>
      </Pressable>
    </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 26, fontWeight: '700', marginBottom: 24 },
  label: { color: '#94A3B8', fontSize: 13, marginBottom: 8, marginTop: 12 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  typeBtn: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  typeBtnActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  typeBtnText: { color: '#94A3B8', fontWeight: '600' },
  typeBtnTextActive: { color: 'white' },
  memberList: { gap: 6, marginBottom: 4 },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  memberRowSelected: { borderColor: '#2563EB', backgroundColor: '#1E3A5F' },
  memberText: { color: '#CBD5E1', fontSize: 15 },
  memberTextSelected: { color: 'white', fontWeight: '600' },
  checkmark: { color: '#2563EB', fontSize: 16, fontWeight: '700' },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: 'white', fontWeight: '600', fontSize: 16 },
});

import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type Member = {
  id: string;
  first_name: string;
  last_name: string;
};

export default function CreateRelationScreen() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();

  const [members, setMembers] = useState<Member[]>([]);
  const [memberA, setMemberA] = useState(memberId || '');
  const [memberB, setMemberB] = useState('');
  const [type, setType] = useState<'couple' | 'parent_child'>('couple');
  const [loading, setLoading] = useState(false);

  async function fetchMembers() {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur chargement membres');
      }

      if (!Array.isArray(data)) {
        throw new Error('La réponse members n’est pas une liste');
      }

      setMembers(data);
    } catch (error) {
      console.error('Erreur fetch members:', error);
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
      setMembers([]);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  async function handleCreateRelation() {
    if (!memberA || !memberB) {
      Alert.alert('Erreur', 'Choisis deux membres.');
      return;
    }

    if (memberA === memberB) {
      Alert.alert('Erreur', 'Un membre ne peut pas être en relation avec lui-même.');
      return;
    }

    try {
      setLoading(true);

      const token = await AsyncStorage.getItem('token');

      const body =
        type === 'couple'
          ? {
              type: 'couple',
              member_a_id: memberA,
              member_b_id: memberB,
            }
          : {
              type: 'parent_child',
              member_a_id: memberA,
              member_b_id: memberB,
              filiation_type: 'biological',
            };

      const response = await fetch(`${API_URL}/relations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur création relation');
      }

      Alert.alert('Succès', 'Relation créée');
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Ajouter une relation</Text>

      <Text style={styles.label}>Type</Text>
      <View style={styles.row}>
        <Pressable
          style={[
            styles.choiceButton,
            type === 'couple' && styles.choiceButtonActive,
          ]}
          onPress={() => setType('couple')}
        >
          <Text style={styles.choiceText}>Couple</Text>
        </Pressable>

        <Pressable
          style={[
            styles.choiceButton,
            type === 'parent_child' && styles.choiceButtonActive,
          ]}
          onPress={() => setType('parent_child')}
        >
          <Text style={styles.choiceText}>Parent / Enfant</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>
        {type === 'couple' ? 'ID membre 1' : 'ID parent'}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="UUID membre A"
        placeholderTextColor="#888"
        value={memberA}
        onChangeText={setMemberA}
      />

      <Text style={styles.label}>
        {type === 'couple' ? 'ID membre 2' : 'ID enfant'}
      </Text>
      <TextInput
        style={styles.input}
        placeholder="UUID membre B"
        placeholderTextColor="#888"
        value={memberB}
        onChangeText={setMemberB}
      />

      <View style={styles.membersBox}>
        <Text style={styles.membersTitle}>Membres disponibles</Text>
        {members.map((member) => (
          <Text key={member.id} style={styles.memberItem}>
            {member.first_name} {member.last_name} — {member.id}
          </Text>
        ))}
      </View>

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleCreateRelation}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Création...' : 'Créer la relation'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0B0F1A',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: '#CBD5E1',
    marginBottom: 8,
    marginTop: 10,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  choiceButton: {
    flex: 1,
    backgroundColor: '#1E293B',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  choiceButtonActive: {
    backgroundColor: '#2563EB',
  },
  choiceText: {
    color: 'white',
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 14,
    borderRadius: 10,
  },
  membersBox: {
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 14,
    marginTop: 18,
    marginBottom: 20,
    maxHeight: 260,
  },
  membersTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  memberItem: {
    color: '#CBD5E1',
    fontSize: 12,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});
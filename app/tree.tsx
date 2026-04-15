import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type Member = {
  id: string;
  first_name: string;
  last_name: string;
};

type Relation = {
  id: string;
  type: 'couple' | 'parent_child';
  member_a_id: string;
  member_b_id: string;
};

export default function TreeScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    try {
      const token = await AsyncStorage.getItem('token');

      const [membersResponse, relationsResponse] = await Promise.all([
        fetch(`${API_URL}/members`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch(`${API_URL}/relations`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      const membersData = await membersResponse.json();
      const relationsData = await relationsResponse.json();

      if (!membersResponse.ok) {
        throw new Error(membersData.message || 'Erreur chargement membres');
      }

      if (!relationsResponse.ok) {
        throw new Error(relationsData.message || 'Erreur chargement relations');
      }

      if (!Array.isArray(membersData)) {
        throw new Error('La réponse members n’est pas une liste');
      }

      if (!Array.isArray(relationsData)) {
        throw new Error('La réponse relations n’est pas une liste');
      }

      setMembers(membersData);
      setRelations(relationsData);

      if (membersData.length > 0 && !selectedMemberId) {
        setSelectedMemberId(membersData[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  function getMemberById(id: string) {
    return members.find((member) => member.id === id) || null;
  }

  const selectedMember = selectedMemberId ? getMemberById(selectedMemberId) : null;

  const parentIds = relations
    .filter(
      (relation) =>
        relation.type === 'parent_child' && relation.member_b_id === selectedMemberId
    )
    .map((relation) => relation.member_a_id);

  const childrenIds = relations
    .filter(
      (relation) =>
        relation.type === 'parent_child' && relation.member_a_id === selectedMemberId
    )
    .map((relation) => relation.member_b_id);

  const partnerIds = relations
    .filter(
      (relation) =>
        relation.type === 'couple' &&
        (relation.member_a_id === selectedMemberId ||
          relation.member_b_id === selectedMemberId)
    )
    .map((relation) =>
      relation.member_a_id === selectedMemberId
        ? relation.member_b_id
        : relation.member_a_id
    );

  const parents = parentIds
    .map(getMemberById)
    .filter((member): member is Member => member !== null);

  const children = childrenIds
    .map(getMemberById)
    .filter((member): member is Member => member !== null);

  const partners = partnerIds
    .map(getMemberById)
    .filter((member): member is Member => member !== null);

  function renderMemberCard(member: Member, variant: 'main' | 'secondary' = 'secondary') {
    return (
      <Pressable
        key={member.id}
        style={[
          styles.memberCard,
          variant === 'main' ? styles.mainMemberCard : styles.secondaryMemberCard,
        ]}
        onPress={() => setSelectedMemberId(member.id)}
      >
        <Text style={styles.memberName}>
          {member.first_name} {member.last_name}
        </Text>
        <Text style={styles.memberId}>{member.id}</Text>
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
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Arbre simplifié</Text>

      <Text style={styles.sectionTitle}>Choix du membre central</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.selectorRow}>
        {members.map((member) => (
          <Pressable
            key={member.id}
            style={[
              styles.selectorButton,
              selectedMemberId === member.id && styles.selectorButtonActive,
            ]}
            onPress={() => setSelectedMemberId(member.id)}
          >
            <Text style={styles.selectorText}>
              {member.first_name} {member.last_name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedMember ? (
        <>
          <Text style={styles.sectionTitle}>Parents</Text>
          <View style={styles.group}>
            {parents.length > 0 ? (
              parents.map((member) => renderMemberCard(member))
            ) : (
              <Text style={styles.emptyText}>Aucun parent trouvé</Text>
            )}
          </View>

          <Text style={styles.linkText}>│</Text>
          <Text style={styles.linkText}>│</Text>

          <Text style={styles.sectionTitle}>Membre central</Text>
          <View style={styles.group}>
            {renderMemberCard(selectedMember, 'main')}
          </View>

          <Text style={styles.sectionTitle}>Conjoint(s)</Text>
          <View style={styles.group}>
            {partners.length > 0 ? (
              partners.map((member) => renderMemberCard(member))
            ) : (
              <Text style={styles.emptyText}>Aucun conjoint trouvé</Text>
            )}
          </View>

          <Text style={styles.linkText}>│</Text>
          <Text style={styles.linkText}>│</Text>

          <Text style={styles.sectionTitle}>Enfant(s)</Text>
          <View style={styles.group}>
            {children.length > 0 ? (
              children.map((member) => renderMemberCard(member))
            ) : (
              <Text style={styles.emptyText}>Aucun enfant trouvé</Text>
            )}
          </View>
        </>
      ) : (
        <Text style={styles.emptyText}>Aucun membre sélectionné</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0B0F1A',
    padding: 20,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#0B0F1A',
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 20,
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 10,
  },
  selectorRow: {
    marginBottom: 8,
  },
  selectorButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 10,
  },
  selectorButtonActive: {
    backgroundColor: '#2563EB',
  },
  selectorText: {
    color: 'white',
    fontWeight: '500',
  },
  group: {
    gap: 10,
  },
  memberCard: {
    borderRadius: 12,
    padding: 14,
  },
  mainMemberCard: {
    backgroundColor: '#2563EB',
  },
  secondaryMemberCard: {
    backgroundColor: '#1E293B',
  },
  memberName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  memberId: {
    color: '#CBD5E1',
    fontSize: 10,
    marginTop: 6,
  },
  linkText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 18,
    marginVertical: 2,
  },
  emptyText: {
    color: '#94A3B8',
    fontStyle: 'italic',
  },
});
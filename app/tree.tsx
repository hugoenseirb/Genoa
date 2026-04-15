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
  member_a_first_name?: string;
  member_a_last_name?: string;
  member_b_first_name?: string;
  member_b_last_name?: string;
};

export default function TreeScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingRelations, setLoadingRelations] = useState(false);

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

      if (data.length > 0) {
        setSelectedMemberId((prev) => prev ?? data[0].id);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function fetchRelations(memberId: string) {
    try {
      setLoadingRelations(true);

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/relations?memberId=${encodeURIComponent(memberId)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur chargement relations');
      }

      if (!Array.isArray(data)) {
        throw new Error('La réponse relations n’est pas une liste');
      }

      setRelations(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
      setRelations([]);
    } finally {
      setLoadingRelations(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      fetchRelations(selectedMemberId);
    }
  }, [selectedMemberId]);

  function getMemberById(id: string) {
    return members.find((member) => member.id === id) || null;
  }

  const selectedMember = selectedMemberId ? getMemberById(selectedMemberId) : null;

  const parents = relations
    .filter(
      (relation) =>
        relation.type === 'parent_child' &&
        relation.member_b_id === selectedMemberId
    )
    .map((relation) => ({
      id: relation.member_a_id,
      first_name:
        relation.member_a_first_name ||
        getMemberById(relation.member_a_id)?.first_name ||
        '',
      last_name:
        relation.member_a_last_name ||
        getMemberById(relation.member_a_id)?.last_name ||
        '',
    }));

  const children = relations
    .filter(
      (relation) =>
        relation.type === 'parent_child' &&
        relation.member_a_id === selectedMemberId
    )
    .map((relation) => ({
      id: relation.member_b_id,
      first_name:
        relation.member_b_first_name ||
        getMemberById(relation.member_b_id)?.first_name ||
        '',
      last_name:
        relation.member_b_last_name ||
        getMemberById(relation.member_b_id)?.last_name ||
        '',
    }));

  const partners = relations
    .filter(
      (relation) =>
        relation.type === 'couple' &&
        (relation.member_a_id === selectedMemberId ||
          relation.member_b_id === selectedMemberId)
    )
    .map((relation) => {
      const isASelected = relation.member_a_id === selectedMemberId;

      return isASelected
        ? {
            id: relation.member_b_id,
            first_name:
              relation.member_b_first_name ||
              getMemberById(relation.member_b_id)?.first_name ||
              '',
            last_name:
              relation.member_b_last_name ||
              getMemberById(relation.member_b_id)?.last_name ||
              '',
          }
        : {
            id: relation.member_a_id,
            first_name:
              relation.member_a_first_name ||
              getMemberById(relation.member_a_id)?.first_name ||
              '',
            last_name:
              relation.member_a_last_name ||
              getMemberById(relation.member_a_id)?.last_name ||
              '',
          };
    });

  function renderMemberCard(
    member: { id: string; first_name: string; last_name: string },
    variant: 'main' | 'secondary' = 'secondary'
  ) {
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
      </Pressable>
    );
  }

  if (loadingMembers) {
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
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.selectorRow}
      >
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

      {loadingRelations ? (
        <View style={styles.loaderBlock}>
          <ActivityIndicator size="small" color="#2563EB" />
        </View>
      ) : selectedMember ? (
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
  loaderBlock: {
    marginTop: 20,
    alignItems: 'center',
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
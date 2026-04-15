import { useEffect, useMemo, useState } from 'react';
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

type DisplayMember = {
  id: string;
  first_name: string;
  last_name: string;
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

  function uniqueMembers(list: DisplayMember[]) {
    const map = new Map<string, DisplayMember>();
    list.forEach((member) => {
      map.set(member.id, member);
    });
    return Array.from(map.values());
  }

  const selectedMember = selectedMemberId ? getMemberById(selectedMemberId) : null;

  const parents = useMemo(() => {
    const values = relations
      .filter(
        (relation) =>
          relation.type === 'parent_child' && relation.member_b_id === selectedMemberId
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

    return uniqueMembers(values);
  }, [relations, selectedMemberId, members]);

  const children = useMemo(() => {
    const values = relations
      .filter(
        (relation) =>
          relation.type === 'parent_child' && relation.member_a_id === selectedMemberId
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

    return uniqueMembers(values);
  }, [relations, selectedMemberId, members]);

  const partners = useMemo(() => {
    const values = relations
      .filter(
        (relation) =>
          relation.type === 'couple' &&
          (relation.member_a_id === selectedMemberId || relation.member_b_id === selectedMemberId)
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

    return uniqueMembers(values);
  }, [relations, selectedMemberId, members]);

  function renderNode(member: DisplayMember, variant: 'main' | 'secondary' = 'secondary') {
    return (
      <Pressable
        key={member.id}
        style={[
          styles.node,
          variant === 'main' ? styles.mainNode : styles.secondaryNode,
        ]}
        onPress={() => setSelectedMemberId(member.id)}
      >
        <Text style={styles.nodeName} numberOfLines={2}>
          {member.first_name} {member.last_name}
        </Text>
      </Pressable>
    );
  }

  function renderNodeRow(items: DisplayMember[], emptyText: string, centered = false) {
    if (items.length === 0) {
      return <Text style={styles.emptyText}>{emptyText}</Text>;
    }

    return (
      <View style={[styles.nodeRow, centered && styles.nodeRowCentered]}>
        {items.map((member) => renderNode(member))}
      </View>
    );
  }

  const parentLineWidth = Math.max(70, Math.min(parents.length * 140, 520));
  const childLineWidth = Math.max(70, Math.min(children.length * 140, 520));

  if (loadingMembers) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Arbre</Text>
      <Text style={styles.subtitle}>Vue graphe simplifiée</Text>

      <Text style={styles.sectionTitle}>Choix du membre central</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.selectorContent}
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
            <Text style={styles.selectorText} numberOfLines={1}>
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
        <View style={styles.graphArea}>
          <Text style={styles.groupLabel}>Parents</Text>
          {renderNodeRow(parents, 'Aucun parent trouvé', true)}

          {parents.length > 0 && (
            <>
              <View style={styles.verticalLine} />
              <View style={[styles.horizontalLine, { width: parentLineWidth }]} />
              <View style={styles.verticalLine} />
            </>
          )}

          <Text style={styles.groupLabel}>Famille proche</Text>
          <View style={[styles.nodeRow, styles.nodeRowCentered]}>
            {partners.slice(0, 1).map((member) => renderNode(member))}
            {renderNode(selectedMember, 'main')}
            {partners.slice(1).map((member) => renderNode(member))}
          </View>

          {children.length > 0 && (
            <>
              <View style={styles.verticalLine} />
              <View style={[styles.horizontalLine, { width: childLineWidth }]} />
              <View style={styles.verticalLine} />
            </>
          )}

          <Text style={styles.groupLabel}>Enfants</Text>
          {renderNodeRow(children, 'Aucun enfant trouvé', true)}
        </View>
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
    marginTop: 24,
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#CBD5E1',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectorContent: {
    paddingBottom: 8,
  },
  selectorButton: {
    backgroundColor: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginRight: 12,
    minWidth: 180,
  },
  selectorButtonActive: {
    backgroundColor: '#2563EB',
  },
  selectorText: {
    color: 'white',
    fontWeight: '600',
  },
  graphArea: {
    marginTop: 20,
    alignItems: 'center',
    paddingBottom: 24,
  },
  groupLabel: {
    color: '#CBD5E1',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
    alignSelf: 'flex-start',
    width: '100%',
  },
  nodeRow: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
  },
  nodeRowCentered: {
    justifyContent: 'center',
  },
  node: {
    width: 210,
    minHeight: 90,
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingVertical: 16,
    justifyContent: 'center',
  },
  mainNode: {
    backgroundColor: '#2563EB',
    width: 260,
    minHeight: 100,
  },
  secondaryNode: {
    backgroundColor: '#1E293B',
  },
  nodeName: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  verticalLine: {
    width: 4,
    height: 34,
    backgroundColor: '#475569',
    borderRadius: 999,
  },
  horizontalLine: {
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 999,
  },
  emptyText: {
    color: '#94A3B8',
    fontStyle: 'italic',
    fontSize: 16,
    alignSelf: 'flex-start',
    width: '100%',
    textAlign: 'center',
    marginBottom: 16,
  },
});
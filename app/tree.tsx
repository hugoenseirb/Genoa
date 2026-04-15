import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import dagre from '@dagrejs/dagre';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const NODE_W = 130;
const NODE_H = 56;
const PADDING = 60;
const BAR_GAP = 20; // espace vertical entre noeud parent et barre de couple
const SIBLING_GAP = 20; // espace vertical entre barre de couple et barre de fratrie
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  gender?: string;
};

type Relation = {
  id: string;
  type: 'couple' | 'parent_child';
  member_a_id: string;
  member_b_id: string;
};

type LayoutNode = Member & { x: number; y: number };

// Une "famille" = un groupe de parents partageant les mêmes enfants
type FamilyEdge = {
  kind: 'family';
  // parents (1 ou 2)
  parents: LayoutNode[];
  // tous leurs enfants communs
  children: LayoutNode[];
  // y de la barre de couple (sous les parents)
  coupleBarY: number;
  // x milieu entre les parents
  midParentX: number;
  // y de la barre de fratrie (au-dessus des enfants)
  siblingBarY: number;
  // x min et max couvrant tous les enfants
  siblingBarLeft: number;
  siblingBarRight: number;
};

type CoupleEdge = {
  kind: 'couple';
  ax: number; ay: number;
  bx: number; by: number;
};

type LayoutEdge = FamilyEdge | CoupleEdge;

export default function TreeScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const vertScrollRef = useRef<ScrollView>(null);
  const horizScrollRef = useRef<ScrollView>(null);

  async function fetchAll() {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [membersRes, relationsRes] = await Promise.all([
        fetch(`${API_URL}/members`, { headers }),
        fetch(`${API_URL}/relations`, { headers }),
      ]);

      const membersData = await membersRes.json();
      const relationsData = await relationsRes.json();

      if (!Array.isArray(membersData)) throw new Error('Erreur chargement membres');
      if (!Array.isArray(relationsData)) throw new Error('Erreur chargement relations');

      setMembers(membersData);
      setRelations(relationsData);
      if (membersData.length > 0) setSelectedId(membersData[0].id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  const { layoutNodes, layoutEdges, graphW, graphH } = useMemo(() => {
    if (members.length === 0) {
      return { layoutNodes: [], layoutEdges: [], graphW: SCREEN_W, graphH: SCREEN_H };
    }

    // ── Dagre layout ─────────────────────────────────────────────────────────
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: PADDING, marginy: PADDING });
    g.setDefaultEdgeLabel(() => ({}));

    members.forEach((m) => g.setNode(m.id, { width: NODE_W, height: NODE_H }));

    relations.forEach((r) => {
      if (r.type === 'parent_child' && g.hasNode(r.member_a_id) && g.hasNode(r.member_b_id)) {
        g.setEdge(r.member_a_id, r.member_b_id);
      }
    });

    dagre.layout(g);

    const layoutNodes: LayoutNode[] = members
      .filter((m) => g.hasNode(m.id) && g.node(m.id)?.x != null)
      .map((m) => { const n = g.node(m.id); return { ...m, x: n.x, y: n.y }; });

    const nodeMap = new Map(layoutNodes.map((n) => [n.id, n]));

    // ── Grouper les enfants par famille (même ensemble de parents) ────────────
    // childId → parentIds[]
    const childParents = new Map<string, string[]>();
    relations.forEach((r) => {
      if (r.type === 'parent_child') {
        const list = childParents.get(r.member_b_id) ?? [];
        list.push(r.member_a_id);
        childParents.set(r.member_b_id, list);
      }
    });

    // Clé famille = IDs parents triés + jointure
    const familyMap = new Map<string, { parentIds: string[]; childIds: string[] }>();
    childParents.forEach((parentIds, childId) => {
      const key = [...parentIds].sort().join('|');
      if (!familyMap.has(key)) familyMap.set(key, { parentIds, childIds: [] });
      familyMap.get(key)!.childIds.push(childId);
    });

    // ── Construire les FamilyEdge ─────────────────────────────────────────────
    const layoutEdges: LayoutEdge[] = [];

    familyMap.forEach(({ parentIds, childIds }) => {
      const parents = parentIds.map((id) => nodeMap.get(id)).filter(Boolean) as LayoutNode[];
      const children = childIds.map((id) => nodeMap.get(id)).filter(Boolean) as LayoutNode[];
      if (parents.length === 0 || children.length === 0) return;

      const maxParentY = Math.max(...parents.map((p) => p.y));
      const coupleBarY = maxParentY + NODE_H / 2 + BAR_GAP;

      const minParentX = Math.min(...parents.map((p) => p.x));
      const maxParentX = Math.max(...parents.map((p) => p.x));
      const midParentX = (minParentX + maxParentX) / 2;

      const minChildY = Math.min(...children.map((c) => c.y));
      const childTopY = minChildY - NODE_H / 2;
      const siblingBarY = coupleBarY + SIBLING_GAP + (childTopY - coupleBarY - SIBLING_GAP) / 2;

      const allChildX = children.map((c) => c.x);
      // La barre de fratrie couvre du plus à gauche au plus à droite des enfants
      // mais au minimum depuis le midParentX
      const siblingBarLeft = Math.min(midParentX, ...allChildX);
      const siblingBarRight = Math.max(midParentX, ...allChildX);

      layoutEdges.push({
        kind: 'family',
        parents,
        children,
        coupleBarY,
        midParentX,
        siblingBarY,
        siblingBarLeft,
        siblingBarRight,
      });
    });

    // ── Arêtes couple (tirets roses) ─────────────────────────────────────────
    relations
      .filter((r) => r.type === 'couple')
      .forEach((r) => {
        const a = nodeMap.get(r.member_a_id);
        const b = nodeMap.get(r.member_b_id);
        if (!a || !b) return;
        const left = a.x <= b.x ? a : b;
        const right = a.x <= b.x ? b : a;
        layoutEdges.push({
          kind: 'couple',
          ax: left.x + NODE_W / 2, ay: left.y,
          bx: right.x - NODE_W / 2, by: right.y,
        });
      });

    const info = g.graph();
    return {
      layoutNodes,
      layoutEdges,
      graphW: Math.max((info.width ?? SCREEN_W) + PADDING * 2, SCREEN_W),
      graphH: Math.max((info.height ?? SCREEN_H) + PADDING * 2, SCREEN_H),
    };
  }, [members, relations]);

  // Centrage initial
  useEffect(() => {
    if (layoutNodes.length === 0) return;
    const target = layoutNodes.find((n) => n.id === selectedId) ?? layoutNodes[0];
    const t = setTimeout(() => {
      vertScrollRef.current?.scrollTo({ y: Math.max(0, target.y - SCREEN_H / 2), animated: false });
      horizScrollRef.current?.scrollTo({ x: Math.max(0, target.x - SCREEN_W / 2), animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [layoutNodes]);

  function scrollToNode(id: string) {
    const node = layoutNodes.find((n) => n.id === id);
    if (!node) return;
    vertScrollRef.current?.scrollTo({ y: Math.max(0, node.y - SCREEN_H / 2), animated: true });
    horizScrollRef.current?.scrollTo({ x: Math.max(0, node.x - SCREEN_W / 2), animated: true });
  }

  function handleNodePress(id: string) {
    setSelectedId(id);
    scrollToNode(id);
  }

  // Génère le chemin SVG d'une FamilyEdge
  function familyPath(e: FamilyEdge): string {
    const parts: string[] = [];

    // 1. Chaque parent descend verticalement jusqu'à coupleBarY
    e.parents.forEach((p) => {
      parts.push(`M${p.x},${p.y + NODE_H / 2} L${p.x},${e.coupleBarY}`);
    });

    // 2. Barre horizontale reliant les parents (si 2 parents)
    if (e.parents.length >= 2) {
      const xs = e.parents.map((p) => p.x);
      parts.push(`M${Math.min(...xs)},${e.coupleBarY} L${Math.max(...xs)},${e.coupleBarY}`);
    }

    // 3. Trait vertical depuis milieu parents → barre de fratrie
    parts.push(`M${e.midParentX},${e.coupleBarY} L${e.midParentX},${e.siblingBarY}`);

    // 4. Barre de fratrie horizontale (couvre tous les enfants)
    if (e.children.length > 1 || e.midParentX !== e.children[0]?.x) {
      parts.push(`M${e.siblingBarLeft},${e.siblingBarY} L${e.siblingBarRight},${e.siblingBarY}`);
    }

    // 5. Chaque enfant remonte depuis la barre de fratrie
    e.children.forEach((c) => {
      parts.push(`M${c.x},${e.siblingBarY} L${c.x},${c.y - NODE_H / 2}`);
    });

    return parts.join(' ');
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (members.length === 0) {
    return (
      <View style={styles.loader}>
        <Text style={styles.emptyText}>Aucun membre dans l'arbre</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={vertScrollRef}
        contentContainerStyle={{ height: graphH }}
        showsVerticalScrollIndicator={false}
      >
        <ScrollView
          ref={horizScrollRef}
          horizontal
          contentContainerStyle={{ width: graphW }}
          showsHorizontalScrollIndicator={false}
        >
          <View style={{ width: graphW, height: graphH }}>

            <Svg width={graphW} height={graphH} style={StyleSheet.absoluteFill} pointerEvents="none">
              {layoutEdges.map((edge, i) => {
                if (edge.kind === 'family') {
                  return (
                    <Path
                      key={i}
                      d={familyPath(edge)}
                      stroke="#475569"
                      strokeWidth={2}
                      fill="none"
                    />
                  );
                }
                // couple
                return (
                  <Path
                    key={i}
                    d={`M${edge.ax},${edge.ay} L${edge.bx},${edge.by}`}
                    stroke="#EC4899"
                    strokeWidth={2}
                    strokeDasharray="6,4"
                    fill="none"
                  />
                );
              })}
            </Svg>

            {layoutNodes.map((node) => {
              const isSelected = node.id === selectedId;
              return (
                <Pressable
                  key={node.id}
                  style={[
                    styles.node,
                    isSelected && styles.nodeSelected,
                    { left: node.x - NODE_W / 2, top: node.y - NODE_H / 2 },
                  ]}
                  onPress={() => handleNodePress(node.id)}
                >
                  <Text style={styles.nodeFirstName} numberOfLines={1}>
                    {node.first_name}
                  </Text>
                  <Text style={styles.nodeLastName} numberOfLines={1}>
                    {node.last_name}
                  </Text>
                </Pressable>
              );
            })}

          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B0F1A' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F1A' },
  emptyText: { color: '#94A3B8', fontSize: 16 },
  node: {
    position: 'absolute',
    width: NODE_W,
    height: NODE_H,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  nodeSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#93C5FD',
  },
  nodeFirstName: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  nodeLastName: {
    color: '#CBD5E1',
    fontSize: 11,
    textAlign: 'center',
  },
});

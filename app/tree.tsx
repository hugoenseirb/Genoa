import { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import Svg, { G, Path } from 'react-native-svg';
import dagre from '@dagrejs/dagre';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useSocket } from '@/context/SocketContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const API_URL = Constants.expoConfig?.extra?.apiUrl;
const NODE_W = 130;
const NODE_H = 56;
const PADDING = 60;
const BAR_GAP = 20;
const SIBLING_GAP = 20;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Member = { id: string; first_name: string; last_name: string; gender?: string };
type Relation = { id: string; type: 'couple' | 'parent_child'; member_a_id: string; member_b_id: string };
type LayoutNode = Member & { x: number; y: number };
type FamilyEdge = {
  kind: 'family';
  parents: LayoutNode[];
  children: LayoutNode[];
  coupleBarY: number;
  midParentX: number;
  siblingBarY: number;
  siblingBarLeft: number;
  siblingBarRight: number;
};
type CoupleEdge = { kind: 'couple'; ax: number; ay: number; bx: number; by: number };
type LayoutEdge = FamilyEdge | CoupleEdge;

type FilterType = 'default' | 'siblings' | 'descendants' | 'ancestors' | 'all';

const FILTERS: { key: FilterType; label: string }[] = [
  { key: 'default',     label: 'Direct' },
  { key: 'siblings',    label: 'Fratrie' },
  { key: 'descendants', label: 'Descendants' },
  { key: 'ancestors',   label: 'Ascendants' },
  { key: 'all',         label: 'Tout' },
];

function computeVisibleIds(focusId: string, filter: FilterType, relations: Relation[], allIds: string[]): Set<string> {
  const visible = new Set<string>([focusId]);

  const getParents  = (id: string) => relations.filter(r => r.type === 'parent_child' && r.member_b_id === id).map(r => r.member_a_id);
  const getChildren = (id: string) => relations.filter(r => r.type === 'parent_child' && r.member_a_id === id).map(r => r.member_b_id);
  const getSpouses  = (id: string) => relations.filter(r => r.type === 'couple' && (r.member_a_id === id || r.member_b_id === id))
                                               .map(r => r.member_a_id === id ? r.member_b_id : r.member_a_id);

  if (filter === 'all') return new Set(allIds);

  if (filter === 'default') {
    getParents(focusId).forEach(id => { visible.add(id); getSpouses(id).forEach(s => visible.add(s)); });
    getChildren(focusId).forEach(id => { visible.add(id); getSpouses(id).forEach(s => visible.add(s)); });
    getSpouses(focusId).forEach(id => visible.add(id));
  }

  if (filter === 'siblings') {
    getSpouses(focusId).forEach(id => visible.add(id));
    getParents(focusId).forEach(p => {
      visible.add(p);
      getSpouses(p).forEach(s => visible.add(s));
      getChildren(p).forEach(sib => { visible.add(sib); getSpouses(sib).forEach(s => visible.add(s)); });
    });
  }

  if (filter === 'descendants') {
    const queue = [focusId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      getSpouses(curr).forEach(s => visible.add(s));
      getChildren(curr).forEach(c => { if (!visible.has(c)) { visible.add(c); queue.push(c); } });
    }
  }

  if (filter === 'ancestors') {
    const queue = [focusId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      getSpouses(curr).forEach(s => visible.add(s));
      getParents(curr).forEach(p => { if (!visible.has(p)) { visible.add(p); queue.push(p); } });
    }
  }

  return visible;
}

export default function TreeScreen() {
  const insets = useSafeAreaInsets();
  const [members, setMembers]     = useState<Member[]>([]);
  const [relations, setRelations] = useState<Relation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<FilterType>('default');
  const [scale, setScale]         = useState(1);

  const vertScrollRef  = useRef<ScrollView>(null);
  const horizScrollRef = useRef<ScrollView>(null);

  const { socket } = useSocket();

  async function fetchAll() {
    try {
      const token = await AsyncStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [mRes, rRes] = await Promise.all([
        fetch(`${API_URL}/members`, { headers }),
        fetch(`${API_URL}/relations`, { headers }),
      ]);
      const mData = await mRes.json();
      const rData = await rRes.json();
      if (!Array.isArray(mData) || !Array.isArray(rData)) throw new Error('Erreur chargement');
      setMembers(mData);
      setRelations(rData);
      if (mData.length > 0) setSelectedId(prev => prev ?? mData[0].id);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAll(); }, []);

  useEffect(() => {
    if (!socket) return;
    const refresh = () => fetchAll();
    socket.on('tree:member_updated',  refresh);
    socket.on('tree:member_created',  refresh);
    socket.on('tree:member_deleted',  refresh);
    socket.on('tree:relation_created', refresh);
    socket.on('tree:relation_deleted', refresh);
    return () => {
      socket.off('tree:member_updated',  refresh);
      socket.off('tree:member_created',  refresh);
      socket.off('tree:member_deleted',  refresh);
      socket.off('tree:relation_created', refresh);
      socket.off('tree:relation_deleted', refresh);
    };
  }, [socket]);

  const { filteredMembers, filteredRelations } = useMemo(() => {
    if (!selectedId) return { filteredMembers: members, filteredRelations: relations };
    const visibleIds = computeVisibleIds(selectedId, filter, relations, members.map(m => m.id));
    return {
      filteredMembers:   members.filter(m => visibleIds.has(m.id)),
      filteredRelations: relations.filter(r => visibleIds.has(r.member_a_id) && visibleIds.has(r.member_b_id)),
    };
  }, [members, relations, selectedId, filter]);

  const { layoutNodes, layoutEdges, graphW, graphH } = useMemo(() => {
    if (filteredMembers.length === 0) return { layoutNodes: [], layoutEdges: [], graphW: SCREEN_W, graphH: SCREEN_H };

    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 100, marginx: PADDING, marginy: PADDING });
    g.setDefaultEdgeLabel(() => ({}));

    filteredMembers.forEach(m => g.setNode(m.id, { width: NODE_W, height: NODE_H }));
    filteredRelations.forEach(r => {
      if (r.type === 'parent_child' && g.hasNode(r.member_a_id) && g.hasNode(r.member_b_id))
        g.setEdge(r.member_a_id, r.member_b_id);
    });
    dagre.layout(g);

    const layoutNodes: LayoutNode[] = filteredMembers
      .filter(m => g.hasNode(m.id) && g.node(m.id)?.x != null)
      .map(m => { const n = g.node(m.id); return { ...m, x: n.x, y: n.y }; });

    const nodeMap = new Map(layoutNodes.map(n => [n.id, n]));

    const childParents = new Map<string, string[]>();
    filteredRelations.forEach(r => {
      if (r.type === 'parent_child') {
        const list = childParents.get(r.member_b_id) ?? [];
        list.push(r.member_a_id);
        childParents.set(r.member_b_id, list);
      }
    });

    const familyMap = new Map<string, { parentIds: string[]; childIds: string[] }>();
    childParents.forEach((parentIds, childId) => {
      const key = [...parentIds].sort().join('|');
      if (!familyMap.has(key)) familyMap.set(key, { parentIds, childIds: [] });
      familyMap.get(key)!.childIds.push(childId);
    });

    const layoutEdges: LayoutEdge[] = [];

    familyMap.forEach(({ parentIds, childIds }) => {
      const parents  = parentIds.map(id => nodeMap.get(id)).filter(Boolean) as LayoutNode[];
      const children = childIds.map(id => nodeMap.get(id)).filter(Boolean) as LayoutNode[];
      if (!parents.length || !children.length) return;

      const maxParentY  = Math.max(...parents.map(p => p.y));
      const coupleBarY  = maxParentY + NODE_H / 2 + BAR_GAP;
      const minParentX  = Math.min(...parents.map(p => p.x));
      const maxParentX  = Math.max(...parents.map(p => p.x));
      const midParentX  = (minParentX + maxParentX) / 2;
      const minChildY   = Math.min(...children.map(c => c.y));
      const childTopY   = minChildY - NODE_H / 2;
      const siblingBarY = coupleBarY + SIBLING_GAP + (childTopY - coupleBarY - SIBLING_GAP) / 2;
      const allChildX   = children.map(c => c.x);
      const siblingBarLeft  = Math.min(midParentX, ...allChildX);
      const siblingBarRight = Math.max(midParentX, ...allChildX);

      layoutEdges.push({ kind: 'family', parents, children, coupleBarY, midParentX, siblingBarY, siblingBarLeft, siblingBarRight });
    });

    filteredRelations.filter(r => r.type === 'couple').forEach(r => {
      const a = nodeMap.get(r.member_a_id);
      const b = nodeMap.get(r.member_b_id);
      if (!a || !b) return;
      const left = a.x <= b.x ? a : b;
      const right = a.x <= b.x ? b : a;
      layoutEdges.push({ kind: 'couple', ax: left.x + NODE_W / 2, ay: left.y, bx: right.x - NODE_W / 2, by: right.y });
    });

    const info = g.graph();
    return {
      layoutNodes,
      layoutEdges,
      graphW: Math.max((info.width ?? SCREEN_W) + PADDING * 2, SCREEN_W),
      graphH: Math.max((info.height ?? SCREEN_H) + PADDING * 2, SCREEN_H),
    };
  }, [filteredMembers, filteredRelations]);

  useEffect(() => {
    if (!layoutNodes.length) return;
    const target = layoutNodes.find(n => n.id === selectedId) ?? layoutNodes[0];
    const t = setTimeout(() => {
      vertScrollRef.current?.scrollTo({ y: Math.max(0, target.y - SCREEN_H / 2), animated: false });
      horizScrollRef.current?.scrollTo({ x: Math.max(0, target.x - SCREEN_W / 2), animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, [layoutNodes]);

  function scrollToNode(id: string) {
    const node = layoutNodes.find(n => n.id === id);
    if (!node) return;
    vertScrollRef.current?.scrollTo({ y: Math.max(0, node.y * scale - SCREEN_H / 2), animated: true });
    horizScrollRef.current?.scrollTo({ x: Math.max(0, node.x * scale - SCREEN_W / 2), animated: true });
  }

  function handleNodePress(id: string) {
    if (id === selectedId) {
      router.push(`/members/${id}`);
    } else {
      setSelectedId(id);
      scrollToNode(id);
    }
  }

  function familyPath(e: FamilyEdge): string {
    const parts: string[] = [];
    e.parents.forEach(p => { parts.push(`M${p.x},${p.y + NODE_H / 2} L${p.x},${e.coupleBarY}`); });
    if (e.parents.length >= 2) {
      const xs = e.parents.map(p => p.x);
      parts.push(`M${Math.min(...xs)},${e.coupleBarY} L${Math.max(...xs)},${e.coupleBarY}`);
    }
    parts.push(`M${e.midParentX},${e.coupleBarY} L${e.midParentX},${e.siblingBarY}`);
    if (e.children.length > 1 || e.midParentX !== e.children[0]?.x)
      parts.push(`M${e.siblingBarLeft},${e.siblingBarY} L${e.siblingBarRight},${e.siblingBarY}`);
    e.children.forEach(c => { parts.push(`M${c.x},${e.siblingBarY} L${c.x},${c.y - NODE_H / 2}`); });
    return parts.join(' ');
  }

  if (loading) return (
    <View style={styles.loader}><ActivityIndicator size="large" color="#2563EB" /></View>
  );

  if (!members.length) return (
    <View style={styles.loader}><Text style={styles.emptyText}>Aucun membre dans l'arbre</Text></View>
  );

  const scaledW = graphW * scale;
  const scaledH = graphH * scale;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterContent}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterBtn, filter === f.key && styles.filterBtnActive]}
            onPress={() => setFilter(f.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.hint}>Tap = sélectionner · Double tap = détails</Text>

      <View style={styles.zoomBar}>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale(s => Math.max(0.4, +(s - 0.2).toFixed(1)))} activeOpacity={0.7}>
          <Text style={styles.zoomText}>−</Text>
        </TouchableOpacity>
        <Text style={styles.zoomLabel}>{Math.round(scale * 100)}%</Text>
        <TouchableOpacity style={styles.zoomBtn} onPress={() => setScale(s => Math.min(2.5, +(s + 0.2).toFixed(1)))} activeOpacity={0.7}>
          <Text style={styles.zoomText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView ref={vertScrollRef} contentContainerStyle={{ height: scaledH }} showsVerticalScrollIndicator={false}>
        <ScrollView ref={horizScrollRef} horizontal contentContainerStyle={{ width: scaledW }} showsHorizontalScrollIndicator={false}>
          <View style={{ width: scaledW, height: scaledH }}>

            <Svg width={scaledW} height={scaledH} style={StyleSheet.absoluteFill} pointerEvents="none">
              <G transform={`scale(${scale})`}>
                {layoutEdges.map((edge, i) => {
                  if (edge.kind === 'family') return (
                    <Path key={i} d={familyPath(edge)} stroke="#475569" strokeWidth={2} fill="none" />
                  );
                  return (
                    <Path key={i} d={`M${edge.ax},${edge.ay} L${edge.bx},${edge.by}`}
                      stroke="#EC4899" strokeWidth={2} strokeDasharray="6,4" fill="none" />
                  );
                })}
              </G>
            </Svg>

            {layoutNodes.map(node => {
              const isSelected = node.id === selectedId;
              return (
                <TouchableOpacity
                  key={node.id}
                  style={[
                    styles.node,
                    isSelected && styles.nodeSelected,
                    {
                      left:   node.x * scale - (NODE_W * scale) / 2,
                      top:    node.y * scale - (NODE_H * scale) / 2,
                      width:  NODE_W * scale,
                      height: NODE_H * scale,
                    },
                  ]}
                  onPress={() => handleNodePress(node.id)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.nodeFirstName, { fontSize: 13 * scale }]} numberOfLines={1}>{node.first_name}</Text>
                  <Text style={[styles.nodeLastName,  { fontSize: 11 * scale }]} numberOfLines={1}>{node.last_name}</Text>
                </TouchableOpacity>
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
  loader:    { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0B0F1A' },
  emptyText: { color: '#94A3B8', fontSize: 16 },

  filterBar:     { maxHeight: 50, flexGrow: 0 },
  filterContent: { flexDirection: 'row', paddingHorizontal: 12, paddingVertical: 8, gap: 8 },
  filterBtn: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155',
  },
  filterBtnActive:  { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  filterText:       { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: 'white' },

  hint: { color: '#475569', fontSize: 11, textAlign: 'center', marginBottom: 2 },

  zoomBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 6 },
  zoomBtn:   { backgroundColor: '#1E293B', width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  zoomText:  { color: 'white', fontSize: 18, fontWeight: '700', lineHeight: 22 },
  zoomLabel: { color: '#94A3B8', fontSize: 13, minWidth: 40, textAlign: 'center' },

  node: {
    position: 'absolute', borderRadius: 12,
    backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 8, borderWidth: 2, borderColor: 'transparent',
  },
  nodeSelected:  { backgroundColor: '#2563EB', borderColor: '#93C5FD' },
  nodeFirstName: { color: 'white', fontWeight: '700', textAlign: 'center' },
  nodeLastName:  { color: '#CBD5E1', textAlign: 'center' },
});

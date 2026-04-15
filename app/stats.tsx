import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type Stats = {
  total_members: number;
  gender_distribution: Record<string, number>;
  avg_life_expectancy: number | null;
  avg_children_per_parent: number | null;
  total_generations: number;
  total_couples: number;
};

const GENDER_LABELS: Record<string, string> = {
  male: 'Hommes',
  female: 'Femmes',
  other: 'Autre',
  unknown: 'Inconnu',
};

const GENDER_COLORS: Record<string, string> = {
  male: '#3B82F6',
  female: '#EC4899',
  other: '#8B5CF6',
  unknown: '#64748B',
};

export default function StatsScreen() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchStats() {
    try {
      const token = await AsyncStorage.getItem('token');

      const response = await fetch(`${API_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur chargement stats');
      }

      setStats(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue';
      Alert.alert('Erreur', message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.loader}>
        <Text style={styles.errorText}>Impossible de charger les stats</Text>
      </View>
    );
  }

  const genderEntries = Object.entries(stats.gender_distribution);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Statistiques</Text>

      {/* Chiffres clés */}
      <View style={styles.grid}>
        <StatCard value={stats.total_members} label="Membres" color="#2563EB" />
        <StatCard value={stats.total_couples} label="Couples" color="#EC4899" />
        <StatCard value={stats.total_generations} label="Générations" color="#059669" />
        <StatCard
          value={stats.avg_children_per_parent != null ? stats.avg_children_per_parent.toFixed(1) : '—'}
          label="Enfants / parent"
          color="#7C3AED"
        />
      </View>

      {/* Espérance de vie */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Espérance de vie moyenne</Text>
        <Text style={styles.bigValue}>
          {stats.avg_life_expectancy != null
            ? `${stats.avg_life_expectancy} ans`
            : 'Pas assez de données'}
        </Text>
        <Text style={styles.cardSub}>Membres décédés avec dates connues</Text>
      </View>

      {/* Distribution des genres */}
      {genderEntries.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Répartition par genre</Text>
          {genderEntries.map(([g, count]) => {
            const pct = Math.round((count / stats.total_members) * 100);
            const color = GENDER_COLORS[g] ?? '#64748B';
            return (
              <View key={g} style={styles.genderRow}>
                <Text style={styles.genderLabel}>
                  {GENDER_LABELS[g] ?? g} — {count}
                </Text>
                <View style={styles.barBg}>
                  <View
                    style={[styles.barFill, { width: `${pct}%` as any, backgroundColor: color }]}
                  />
                </View>
                <Text style={[styles.pct, { color }]}>{pct}%</Text>
              </View>
            );
          })}
        </View>
      )}

      <Pressable style={styles.refreshBtn} onPress={() => { setLoading(true); fetchStats(); }}>
        <Text style={styles.refreshText}>Actualiser</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatCard({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderTopColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0F1A',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0B0F1A',
  },
  errorText: {
    color: '#94A3B8',
    fontSize: 16,
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 3,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  bigValue: {
    color: '#2563EB',
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardSub: {
    color: '#64748B',
    fontSize: 12,
  },
  genderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  genderLabel: {
    color: '#CBD5E1',
    fontSize: 13,
    width: 120,
  },
  barBg: {
    flex: 1,
    height: 8,
    backgroundColor: '#0F172A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
  pct: {
    fontSize: 12,
    fontWeight: '600',
    width: 36,
    textAlign: 'right',
  },
  refreshBtn: {
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  refreshText: {
    color: '#94A3B8',
    fontWeight: '600',
  },
});

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ScreenWrapper from '@/components/ScreenWrapper';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  gender?: string;
  birth_date?: string;
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;

    try {
      setLoading(true);
      setSearched(true);

      const token = await AsyncStorage.getItem('token');

      const response = await fetch(
        `${API_URL}/members?q=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur recherche');
      }

      setResults(Array.isArray(data) ? data : []);
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  function renderItem({ item }: { item: Member }) {
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/members/${item.id}`)}
      >
        <Text style={styles.name}>
          {item.first_name} {item.last_name}
        </Text>
        {item.birth_date && (
          <Text style={styles.sub}>Ne(e) le {formatDate(item.birth_date)}</Text>
        )}
      </Pressable>
    );
  }

  return (
    <ScreenWrapper>
      <View style={styles.container}>
        <Text style={styles.title}>Recherche</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            placeholder="Prénom ou nom…"
            placeholderTextColor="#64748B"
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
          />
          <Pressable style={styles.searchBtn} onPress={handleSearch}>
            <Text style={styles.searchBtnText}>OK</Text>
          </Pressable>
        </View>

        {loading && (
          <ActivityIndicator
            size="large"
            color="#2563EB"
            style={{ marginTop: 40 }}
          />
        )}

        {!loading && searched && results.length === 0 && (
          <Text style={styles.empty}>Aucun résultat pour « {query} »</Text>
        )}

        {!loading && results.length > 0 && (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E293B',
    color: 'white',
    padding: 14,
    borderRadius: 10,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    borderRadius: 10,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 15,
  },
  card: {
    backgroundColor: '#1E293B',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  name: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  sub: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
  },
  empty: {
    color: '#94A3B8',
    fontSize: 15,
    textAlign: 'center',
    marginTop: 40,
  },
});

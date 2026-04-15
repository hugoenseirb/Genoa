import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  professions?: string[] | string;
};

const API_URL = Constants.expoConfig?.extra?.apiUrl;

function normalizeArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [];
}

function buildPhotoUrl(photoUrl?: string) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;

  const baseUrl = API_URL?.replace("/api/v1", "");
  if (!baseUrl) return null;

  return `${baseUrl}${photoUrl}`;
}

export default function MembersScreen() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchMembers() {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${API_URL}/members`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur fetch members:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, []);

  function renderItem({ item }: { item: Member }) {
    const professions = normalizeArray(item.professions);
    const photoSrc = buildPhotoUrl(item.photo_url);

    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/members/${item.id}`)}
      >
        {photoSrc ? (
          <Image source={{ uri: photoSrc }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarPlaceholderText}>?</Text>
          </View>
        )}

        <View style={styles.cardText}>
          <Text style={styles.name}>
            {item.first_name} {item.last_name}
          </Text>
          {professions.length > 0 ? (
            <Text style={styles.profession}>{professions[0]}</Text>
          ) : null}
        </View>
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
    <View style={styles.container}>
      <Text style={styles.title}>Membres</Text>

      <FlatList
        data={members}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      <Pressable
        style={styles.button}
        onPress={() => router.push("/members/create")}
      >
        <Text style={styles.buttonText}>+ Ajouter un membre</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F1A",
    paddingHorizontal: 16,
    paddingTop: 40,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#334155",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarPlaceholderText: {
    color: "white",
    fontWeight: "700",
  },
  cardText: {
    flex: 1,
  },
  name: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  profession: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 4,
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#0B0F1A",
  },
});

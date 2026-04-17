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
import ScreenWrapper from "@/components/ScreenWrapper";
import { colors, shared } from "@/constants/sharedStyles";
import { normalizeArray, buildPhotoUrl } from "@/utils/memberUtils";

type Member = {
  id: string;
  first_name: string;
  last_name: string;
  photo_url?: string;
  professions?: string[] | string;
};

const API_URL = Constants.expoConfig?.extra?.apiUrl;

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
    const photoSrc = buildPhotoUrl(item.photo_url, API_URL);

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
      <ScreenWrapper>
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
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
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },
  title: { color: colors.textPrimary, fontSize: 28, fontWeight: "700", marginBottom: 20 },
  card: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.border, justifyContent: "center", alignItems: "center" },
  avatarPlaceholderText: { color: colors.textPrimary, fontWeight: "700" },
  cardText: { flex: 1 },
  name: { color: colors.textPrimary, fontSize: 16, fontWeight: "600" },
  profession: { color: colors.textMuted, fontSize: 13, marginTop: 4 },
  button: { backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: "center", marginTop: 10, marginBottom: 10 },
  buttonText: { color: colors.textPrimary, fontWeight: "600" },
  loader: shared.loader,
});

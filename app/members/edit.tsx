import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

const API_URL = Constants.expoConfig?.extra?.apiUrl;

const GENDERS = ["male", "female", "other", "unknown"] as const;
const GENDER_LABELS: Record<string, string> = {
  male: "Homme",
  female: "Femme",
  other: "Autre",
  unknown: "Inconnu",
};

type Contacts = {
  addresses?: string[];
  phones?: string[];
  emails?: string[];
};

function normalizeArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [];
}

function normalizeContacts(value: unknown): Contacts {
  if (!value || typeof value !== "object") return {};
  const contacts = value as Contacts;
  return {
    addresses: normalizeArray(contacts.addresses),
    phones: normalizeArray(contacts.phones),
    emails: normalizeArray(contacts.emails),
  };
}

function buildPhotoUrl(photoUrl?: string | null) {
  if (!photoUrl) return null;
  if (photoUrl.startsWith("http")) return photoUrl;
  const base = API_URL?.replace("/api/v1", "");
  return `${base}${photoUrl}`;
}

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState("unknown");
  const [birthDate, setBirthDate] = useState("");
  const [birthPlace, setBirthPlace] = useState("");
  const [deathDate, setDeathDate] = useState("");
  const [deathPlace, setDeathPlace] = useState("");
  const [profession1, setProfession1] = useState("");
  const [profession2, setProfession2] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [emailContact, setEmailContact] = useState("");
  const [notesPublic, setNotesPublic] = useState("");
  const [notesPrivate, setNotesPrivate] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    if (id) fetchMember();
  }, [id]);

  async function fetchMember() {
    try {
      const token = await AsyncStorage.getItem("token");
      const response = await fetch(`${API_URL}/members/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur chargement");

      const contacts = normalizeContacts(data.contacts);
      const professions = normalizeArray(data.professions);

      setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? "");
      setGender(data.gender ?? "unknown");
      setBirthDate(data.birth_date ? data.birth_date.split("T")[0] : "");
      setBirthPlace(data.birth_place ?? "");
      setDeathDate(data.death_date ? data.death_date.split("T")[0] : "");
      setDeathPlace(data.death_place ?? "");
      setProfession1(professions[0] ?? "");
      setProfession2(professions[1] ?? "");
      setAddress(contacts.addresses?.[0] ?? "");
      setPhone(contacts.phones?.[0] ?? "");
      setEmailContact(contacts.emails?.[0] ?? "");
      setNotesPublic(data.notes_public ?? "");
      setNotesPrivate(data.notes_private ?? "");
      setIsPrivate(Boolean(data.is_private));
      setPhotoUrl(data.photo_url ?? "");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePickPhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert("Erreur", "Permission galerie refusée");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      if (!asset?.uri) {
        Alert.alert("Erreur", "Image invalide");
        return;
      }

      await uploadPhoto(asset.uri, asset.mimeType);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      Alert.alert("Erreur", message);
    }
  }

  async function uploadPhoto(uri: string, mimeType?: string) {
    try {
      setUploadingPhoto(true);

      const token = await AsyncStorage.getItem("token");
      const formData = new FormData();

      const filename = uri.split("/").pop() || "photo.jpg";
      const finalType = mimeType || "image/jpeg";

      formData.append("photo", {
        uri,
        name: filename,
        type: finalType,
      } as any);

      const response = await fetch(`${API_URL}/members/${id}/photo`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur upload photo");
      }

      setPhotoUrl(data.photo_url || "");
      Alert.alert("Succès", "Photo mise à jour");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      Alert.alert("Erreur", message);
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Erreur", "Prénom et nom sont requis");
      return;
    }

    try {
      setSaving(true);
      const token = await AsyncStorage.getItem("token");

      const professions = [profession1.trim(), profession2.trim()].filter(
        Boolean,
      );
      const contacts = {
        addresses: address.trim() ? [address.trim()] : [],
        phones: phone.trim() ? [phone.trim()] : [],
        emails: emailContact.trim() ? [emailContact.trim()] : [],
      };

      const body: Record<string, any> = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        is_private: isPrivate,
      };

      if (birthDate.trim()) body.birth_date = birthDate.trim();
      if (birthPlace.trim()) body.birth_place = birthPlace.trim();
      if (deathDate.trim()) body.death_date = deathDate.trim();
      if (deathPlace.trim()) body.death_place = deathPlace.trim();
      if (notesPublic.trim()) body.notes_public = notesPublic.trim();
      if (notesPrivate.trim()) body.notes_private = notesPrivate.trim();
      if (professions.length > 0) body.professions = professions;
      if (
        contacts.addresses.length > 0 ||
        contacts.phones.length > 0 ||
        contacts.emails.length > 0
      ) {
        body.contacts = contacts;
      }

      const response = await fetch(`${API_URL}/members/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erreur modification");

      Alert.alert("Succès", "Membre mis à jour");
      router.back();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      Alert.alert("Erreur", message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const photoSrc = buildPhotoUrl(photoUrl);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {photoSrc ? (
        <Image source={{ uri: photoSrc }} style={styles.photo} />
      ) : (
        <View style={styles.photoPlaceholder}>
          <Text style={styles.photoPlaceholderText}>Aucune photo</Text>
        </View>
      )}

      <Pressable
        style={[styles.photoButton, uploadingPhoto && styles.disabled]}
        onPress={handlePickPhoto}
        disabled={uploadingPhoto}
      >
        <Text style={styles.photoButtonText}>
          {uploadingPhoto ? "Upload..." : "Choisir une photo"}
        </Text>
      </Pressable>

      <Text style={styles.title}>Modifier le membre</Text>

      <Text style={styles.label}>Prénom *</Text>
      <TextInput
        style={styles.input}
        value={firstName}
        onChangeText={setFirstName}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Nom *</Text>
      <TextInput
        style={styles.input}
        value={lastName}
        onChangeText={setLastName}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Genre</Text>
      <View style={styles.genderRow}>
        {GENDERS.map((g) => (
          <Pressable
            key={g}
            style={[styles.genderBtn, gender === g && styles.genderBtnActive]}
            onPress={() => setGender(g)}
          >
            <Text
              style={[
                styles.genderText,
                gender === g && styles.genderTextActive,
              ]}
            >
              {GENDER_LABELS[g]}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Date de naissance (AAAA-MM-JJ)</Text>
      <TextInput
        style={styles.input}
        value={birthDate}
        onChangeText={setBirthDate}
        placeholder="ex : 1985-03-12"
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Lieu de naissance</Text>
      <TextInput
        style={styles.input}
        value={birthPlace}
        onChangeText={setBirthPlace}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Date de décès (AAAA-MM-JJ)</Text>
      <TextInput
        style={styles.input}
        value={deathDate}
        onChangeText={setDeathDate}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Lieu de décès</Text>
      <TextInput
        style={styles.input}
        value={deathPlace}
        onChangeText={setDeathPlace}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.sectionTitle}>Professions</Text>

      <Text style={styles.label}>Profession 1</Text>
      <TextInput
        style={styles.input}
        value={profession1}
        onChangeText={setProfession1}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Profession 2</Text>
      <TextInput
        style={styles.input}
        value={profession2}
        onChangeText={setProfession2}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.sectionTitle}>Coordonnées</Text>

      <Text style={styles.label}>Adresse</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput
        style={styles.input}
        value={phone}
        onChangeText={setPhone}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        value={emailContact}
        onChangeText={setEmailContact}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.sectionTitle}>Informations complémentaires</Text>

      <Text style={styles.label}>Information publique</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notesPublic}
        onChangeText={setNotesPublic}
        multiline
        numberOfLines={4}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Information privée</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        value={notesPrivate}
        onChangeText={setNotesPrivate}
        multiline
        numberOfLines={4}
        placeholderTextColor="#64748B"
      />

      <Text style={styles.label}>Membre privé</Text>
      <View style={styles.privacyRow}>
        <Pressable
          style={[styles.toggleBtn, !isPrivate && styles.toggleBtnActive]}
          onPress={() => setIsPrivate(false)}
        >
          <Text
            style={[styles.toggleText, !isPrivate && styles.toggleTextActive]}
          >
            Non
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, isPrivate && styles.toggleBtnActive]}
          onPress={() => setIsPrivate(true)}
        >
          <Text
            style={[styles.toggleText, isPrivate && styles.toggleTextActive]}
          >
            Oui
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={[styles.button, saving && styles.disabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.buttonText}>
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0B0F1A" },
  content: { padding: 20, paddingBottom: 40 },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0B0F1A",
  },
  photo: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: "center",
    marginBottom: 12,
  },
  photoPlaceholder: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignSelf: "center",
    marginBottom: 12,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
  },
  photoPlaceholderText: {
    color: "#64748B",
    fontSize: 13,
  },
  photoButton: {
    backgroundColor: "#7C3AED",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  photoButtonText: {
    color: "white",
    fontWeight: "600",
  },
  title: { color: "white", fontSize: 26, fontWeight: "700", marginBottom: 24 },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 12,
  },
  label: { color: "#94A3B8", fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: "#1E293B",
    color: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  genderRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  genderBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
  },
  genderBtnActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  genderText: { color: "#94A3B8", fontSize: 14 },
  genderTextActive: { color: "white", fontWeight: "600" },
  privacyRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  toggleBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  toggleText: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "white",
    fontWeight: "700",
  },
  button: {
    backgroundColor: "#059669",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  disabled: { opacity: 0.6 },
  buttonText: { color: "white", fontWeight: "600", fontSize: 16 },
});

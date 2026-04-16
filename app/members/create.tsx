import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ScreenWrapper from "@/components/ScreenWrapper";

const API_URL = Constants.expoConfig?.extra?.apiUrl;

const GENDERS = ["male", "female", "other", "unknown"] as const;
const GENDER_LABELS: Record<string, string> = {
  male: "Homme",
  female: "Femme",
  other: "Autre",
  unknown: "Inconnu",
};

export default function CreateMemberScreen() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<string>("unknown");
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
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert("Erreur", "Remplis prénom et nom");
      return;
    }

    try {
      setLoading(true);

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

      const response = await fetch(`${API_URL}/members`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Erreur création");
      }

      router.replace("/members");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur inconnue";
      Alert.alert("Erreur", message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper noBottomInset>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Ajouter un membre</Text>

      <Text style={styles.label}>Prénom *</Text>
      <TextInput
        style={styles.input}
        placeholder="Prénom"
        placeholderTextColor="#64748B"
        value={firstName}
        onChangeText={setFirstName}
      />

      <Text style={styles.label}>Nom *</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom"
        placeholderTextColor="#64748B"
        value={lastName}
        onChangeText={setLastName}
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
        placeholder="ex : 1985-03-12"
        placeholderTextColor="#64748B"
        value={birthDate}
        onChangeText={setBirthDate}
      />

      <Text style={styles.label}>Lieu de naissance</Text>
      <TextInput
        style={styles.input}
        placeholder="ex : Paris, France"
        placeholderTextColor="#64748B"
        value={birthPlace}
        onChangeText={setBirthPlace}
      />

      <Text style={styles.label}>Date de décès (AAAA-MM-JJ)</Text>
      <TextInput
        style={styles.input}
        placeholder="Laisser vide si vivant"
        placeholderTextColor="#64748B"
        value={deathDate}
        onChangeText={setDeathDate}
      />

      <Text style={styles.label}>Lieu de décès</Text>
      <TextInput
        style={styles.input}
        placeholder="ex : Bordeaux, France"
        placeholderTextColor="#64748B"
        value={deathPlace}
        onChangeText={setDeathPlace}
      />

      <Text style={styles.sectionTitle}>Professions</Text>

      <Text style={styles.label}>Profession 1</Text>
      <TextInput
        style={styles.input}
        placeholder="ex : Médecin"
        placeholderTextColor="#64748B"
        value={profession1}
        onChangeText={setProfession1}
      />

      <Text style={styles.label}>Profession 2</Text>
      <TextInput
        style={styles.input}
        placeholder="ex : Professeur"
        placeholderTextColor="#64748B"
        value={profession2}
        onChangeText={setProfession2}
      />

      <Text style={styles.sectionTitle}>Coordonnées</Text>

      <Text style={styles.label}>Adresse</Text>
      <TextInput
        style={styles.input}
        placeholder="Adresse"
        placeholderTextColor="#64748B"
        value={address}
        onChangeText={setAddress}
      />

      <Text style={styles.label}>Téléphone</Text>
      <TextInput
        style={styles.input}
        placeholder="Téléphone"
        placeholderTextColor="#64748B"
        value={phone}
        onChangeText={setPhone}
      />

      <Text style={styles.label}>E-mail</Text>
      <TextInput
        style={styles.input}
        placeholder="contact@email.com"
        placeholderTextColor="#64748B"
        value={emailContact}
        onChangeText={setEmailContact}
      />

      <Text style={styles.sectionTitle}>Informations complémentaires</Text>

      <Text style={styles.label}>Information publique</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Visible par tous"
        placeholderTextColor="#64748B"
        value={notesPublic}
        onChangeText={setNotesPublic}
        multiline
        numberOfLines={4}
      />

      <Text style={styles.label}>Information privée</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Visible seulement par les éditeurs/admin"
        placeholderTextColor="#64748B"
        value={notesPrivate}
        onChangeText={setNotesPrivate}
        multiline
        numberOfLines={4}
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

      <Text style={styles.photoInfo}>
        Photo : à brancher ensuite via la route upload dédiée.
      </Text>

      <Pressable
        style={[styles.button, loading && styles.disabled]}
        onPress={handleCreate}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Création..." : "Créer le membre"}
        </Text>
      </Pressable>
    </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B0F1A",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    color: "white",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 24,
  },
  sectionTitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 12,
  },
  label: {
    color: "#94A3B8",
    fontSize: 13,
    marginBottom: 6,
    marginTop: 4,
  },
  input: {
    backgroundColor: "#1E293B",
    color: "white",
    padding: 14,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: "top",
  },
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
  genderBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  genderText: {
    color: "#94A3B8",
    fontSize: 14,
  },
  genderTextActive: {
    color: "white",
    fontWeight: "600",
  },
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
  photoInfo: {
    color: "#64748B",
    fontSize: 13,
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#2563EB",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 16,
  },
});

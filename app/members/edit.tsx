import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MemberForm from '@/components/MemberForm';
import ScreenWrapper from '@/components/ScreenWrapper';
import { buildBody, buildPhotoUrl, FormState, INITIAL_FORM, normalizeArray, normalizeContacts } from '@/utils/memberUtils';
import { colors } from '@/constants/sharedStyles';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

export default function EditMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoStatus, setPhotoStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  function onChange(key: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  useEffect(() => { if (id) fetchMember(); }, [id]);

  async function fetchMember() {
    try {
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/members/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur chargement');
      const contacts = normalizeContacts(data.contacts);
      const professions = normalizeArray(data.professions);
      setForm({
        firstName: data.first_name ?? '',
        lastName: data.last_name ?? '',
        gender: data.gender ?? 'unknown',
        birthDate: data.birth_date ? data.birth_date.split('T')[0] : '',
        birthPlace: data.birth_place ?? '',
        deathDate: data.death_date ? data.death_date.split('T')[0] : '',
        deathPlace: data.death_place ?? '',
        profession1: professions[0] ?? '',
        profession2: professions[1] ?? '',
        address: contacts.addresses?.[0] ?? '',
        phone: contacts.phones?.[0] ?? '',
        emailContact: contacts.emails?.[0] ?? '',
        notesPublic: data.notes_public ?? '',
        notesPrivate: data.notes_private ?? '',
        isPrivate: Boolean(data.is_private),
      });
      setPhotoUrl(data.photo_url ?? '');
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  async function handlePickPhoto() {
    setPhotoStatus(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setPhotoStatus({ ok: false, msg: 'Permission galerie refusée' }); return; }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.8 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset?.uri) { setPhotoStatus({ ok: false, msg: 'Image invalide' }); return; }
      await uploadPhoto(asset.uri);
    } catch (error) {
      setPhotoStatus({ ok: false, msg: error instanceof Error ? error.message : 'Erreur inconnue' });
    }
  }

  async function uploadPhoto(uri: string) {
    try {
      setUploadingPhoto(true);
      setPhotoStatus({ ok: true, msg: 'Envoi en cours...' });
      const token = await AsyncStorage.getItem('token');
      const ext = uri.split('.').pop()?.toLowerCase() ?? 'jpg';
      const safeExt = ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
      const filename = `photo.${safeExt}`;
      const finalType = safeExt === 'png' ? 'image/png' : safeExt === 'webp' ? 'image/webp' : 'image/jpeg';
      const formData = new FormData();
      if (Platform.OS === 'web') {
        const blob = await (await fetch(uri)).blob();
        formData.append('photo', blob, filename);
      } else {
        formData.append('photo', { uri, name: filename, type: finalType } as any);
      }
      const response = await fetch(`${API_URL}/members/${id}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (response.ok) {
        const data = await response.json();
        setPhotoUrl(data.photo_url || '');
        setPhotoStatus({ ok: true, msg: 'Photo mise à jour ✓' });
      } else {
        let msg = `Erreur ${response.status}`;
        try { const d = await response.json(); if (d?.message) msg = d.message; } catch {}
        setPhotoStatus({ ok: false, msg });
      }
    } catch (error) {
      setPhotoStatus({ ok: false, msg: error instanceof Error ? error.message : 'Erreur réseau' });
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSave() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Erreur', 'Prénom et nom sont requis');
      return;
    }
    try {
      setSaving(true);
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildBody(form)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur modification');
      Alert.alert('Succès', 'Membre mis à jour');
      router.back();
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
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

  const photoSrc = buildPhotoUrl(photoUrl, API_URL);

  return (
    <ScreenWrapper noBottomInset>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        {photoSrc
          ? <Image key={photoSrc} source={{ uri: photoSrc }} style={styles.photo} resizeMode="cover" />
          : <View style={styles.photoPlaceholder}><Text style={styles.photoPlaceholderText}>Aucune photo</Text></View>
        }
        <Pressable style={[styles.photoButton, uploadingPhoto && styles.disabled]} onPress={handlePickPhoto} disabled={uploadingPhoto}>
          <Text style={styles.photoButtonText}>{uploadingPhoto ? 'Envoi en cours...' : 'Choisir une photo'}</Text>
        </Pressable>
        {photoStatus && (
          <Text style={[styles.photoStatusText, { color: photoStatus.ok ? '#34D399' : '#F87171' }]}>{photoStatus.msg}</Text>
        )}
        <Text style={styles.title}>Modifier le membre</Text>
        <MemberForm form={form} onChange={onChange} onSubmit={handleSave} loading={saving} submitLabel="Enregistrer" submitColor="#059669" />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  photo: { width: 140, height: 140, borderRadius: 70, alignSelf: 'center', marginBottom: 12 },
  photoPlaceholder: { width: 140, height: 140, borderRadius: 70, alignSelf: 'center', marginBottom: 12, backgroundColor: colors.surface, justifyContent: 'center', alignItems: 'center' },
  photoPlaceholderText: { color: colors.textDisabled, fontSize: 13 },
  photoButton: { backgroundColor: '#7C3AED', padding: 12, borderRadius: 10, alignItems: 'center', marginBottom: 20 },
  photoButtonText: { color: colors.textPrimary, fontWeight: '600' },
  photoStatusText: { textAlign: 'center', fontSize: 13, marginBottom: 12, marginTop: -8 },
  title: { color: colors.textPrimary, fontSize: 26, fontWeight: '700', marginBottom: 24 },
  disabled: { opacity: 0.6 },
});

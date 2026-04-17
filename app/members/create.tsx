import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text } from 'react-native';
import MemberForm from '@/components/MemberForm';
import ScreenWrapper from '@/components/ScreenWrapper';
import { buildBody, FormState, INITIAL_FORM } from '@/utils/memberUtils';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

export default function CreateMemberScreen() {
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [loading, setLoading] = useState(false);

  function onChange(key: keyof FormState, value: string | boolean) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  async function handleCreate() {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Erreur', 'Remplis prénom et nom');
      return;
    }
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('token');
      const response = await fetch(`${API_URL}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(buildBody(form)),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Erreur création');
      router.replace('/members');
    } catch (error) {
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScreenWrapper noBottomInset>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Ajouter un membre</Text>
        <MemberForm form={form} onChange={onChange} onSubmit={handleCreate} loading={loading} submitLabel="Créer le membre" />
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 40 },
  title: { color: 'white', fontSize: 28, fontWeight: '700', marginBottom: 24 },
});

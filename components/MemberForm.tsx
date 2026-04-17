import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { GENDERS, GENDER_LABELS, FormState } from '@/utils/memberUtils';
import { colors } from '@/constants/sharedStyles';

type Props = {
  form: FormState;
  onChange: (key: keyof FormState, value: string | boolean) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
  submitColor?: string;
  children?: ReactNode;
};

function Field({ label, value, onChange, multiline, numberOfLines, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  numberOfLines?: number;
  placeholder?: string;
}) {
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.textArea]}
        value={value}
        onChangeText={onChange}
        placeholderTextColor="#64748B"
        multiline={multiline}
        numberOfLines={numberOfLines}
        placeholder={placeholder}
      />
    </>
  );
}

export default function MemberForm({ form, onChange, onSubmit, loading, submitLabel, submitColor = '#2563EB', children }: Props) {
  return (
    <>
      {children}

      <Field label="Prénom *" value={form.firstName} onChange={v => onChange('firstName', v)} />
      <Field label="Nom *" value={form.lastName} onChange={v => onChange('lastName', v)} />

      <Text style={styles.label}>Genre</Text>
      <View style={styles.genderRow}>
        {GENDERS.map(g => (
          <Pressable key={g} style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]} onPress={() => onChange('gender', g)}>
            <Text style={[styles.genderText, form.gender === g && styles.genderTextActive]}>{GENDER_LABELS[g]}</Text>
          </Pressable>
        ))}
      </View>

      <Field label="Date de naissance (AAAA-MM-JJ)" value={form.birthDate} onChange={v => onChange('birthDate', v)} placeholder="ex : 1985-03-12" />
      <Field label="Lieu de naissance" value={form.birthPlace} onChange={v => onChange('birthPlace', v)} />
      <Field label="Date de décès (AAAA-MM-JJ)" value={form.deathDate} onChange={v => onChange('deathDate', v)} placeholder="Laisser vide si vivant" />
      <Field label="Lieu de décès" value={form.deathPlace} onChange={v => onChange('deathPlace', v)} />

      <Text style={styles.sectionTitle}>Professions</Text>
      <Field label="Profession 1" value={form.profession1} onChange={v => onChange('profession1', v)} placeholder="ex : Médecin" />
      <Field label="Profession 2" value={form.profession2} onChange={v => onChange('profession2', v)} placeholder="ex : Professeur" />

      <Text style={styles.sectionTitle}>Coordonnées</Text>
      <Field label="Adresse" value={form.address} onChange={v => onChange('address', v)} />
      <Field label="Téléphone" value={form.phone} onChange={v => onChange('phone', v)} />
      <Field label="E-mail" value={form.emailContact} onChange={v => onChange('emailContact', v)} />

      <Text style={styles.sectionTitle}>Informations complémentaires</Text>
      <Field label="Information publique" value={form.notesPublic} onChange={v => onChange('notesPublic', v)} multiline numberOfLines={4} placeholder="Visible par tous" />
      <Field label="Information privée" value={form.notesPrivate} onChange={v => onChange('notesPrivate', v)} multiline numberOfLines={4} placeholder="Visible seulement par les éditeurs/admin" />

      <Text style={styles.label}>Membre privé</Text>
      <View style={styles.privacyRow}>
        {([false, true] as const).map(val => (
          <Pressable key={String(val)} style={[styles.toggleBtn, form.isPrivate === val && styles.toggleBtnActive]} onPress={() => onChange('isPrivate', val)}>
            <Text style={[styles.toggleText, form.isPrivate === val && styles.toggleTextActive]}>{val ? 'Oui' : 'Non'}</Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={[styles.button, { backgroundColor: submitColor }, loading && styles.disabled]} onPress={onSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? '...' : submitLabel}</Text>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.surface, color: colors.textPrimary, padding: 14, borderRadius: 10, marginBottom: 14, fontSize: 15 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginTop: 10, marginBottom: 12 },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  genderBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  genderBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  genderText: { color: colors.textMuted, fontSize: 14 },
  genderTextActive: { color: colors.textPrimary, fontWeight: '600' },
  privacyRow: { flexDirection: 'row', gap: 10, marginBottom: 18 },
  toggleBtn: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  toggleBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  toggleText: { color: colors.textMuted, fontWeight: '500' },
  toggleTextActive: { color: colors.textPrimary, fontWeight: '700' },
  button: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  disabled: { opacity: 0.6 },
  buttonText: { color: colors.textPrimary, fontWeight: '600', fontSize: 16 },
});

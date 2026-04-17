import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#0B0F1A',
  surface: '#1E293B',
  border: '#334155',
  primary: '#2563EB',
  success: '#059669',
  danger: '#DC2626',
  textPrimary: 'white',
  textMuted: '#94A3B8',
  textDisabled: '#64748B',
} as const;

export const shared = StyleSheet.create({
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: colors.surface, padding: 16, borderRadius: 12, marginBottom: 20 },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 12 },
  label: { color: colors.textMuted, fontSize: 13, marginBottom: 6, marginTop: 4 },
  button: { padding: 16, borderRadius: 12, alignItems: 'center' as const, marginBottom: 12 },
  buttonText: { color: colors.textPrimary, fontWeight: '600' as const },
  disabled: { opacity: 0.6 },
  photoCircle: { width: 140, height: 140, borderRadius: 70, alignSelf: 'center' as const, marginBottom: 18 },
});

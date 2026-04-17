export type FormState = {
  firstName: string;
  lastName: string;
  gender: string;
  birthDate: string;
  birthPlace: string;
  deathDate: string;
  deathPlace: string;
  profession1: string;
  profession2: string;
  address: string;
  phone: string;
  emailContact: string;
  notesPublic: string;
  notesPrivate: string;
  isPrivate: boolean;
};

export const INITIAL_FORM: FormState = {
  firstName: '', lastName: '', gender: 'unknown',
  birthDate: '', birthPlace: '', deathDate: '', deathPlace: '',
  profession1: '', profession2: '', address: '', phone: '',
  emailContact: '', notesPublic: '', notesPrivate: '', isPrivate: false,
};

export const GENDERS = ['male', 'female', 'other', 'unknown'] as const;

export const GENDER_LABELS: Record<string, string> = {
  male: 'Homme', female: 'Femme', other: 'Autre', unknown: 'Inconnu',
};

export type Contacts = {
  addresses?: string[];
  phones?: string[];
  emails?: string[];
};

export function normalizeArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  return [];
}

export function normalizeContacts(value: unknown): Contacts {
  if (!value || typeof value !== 'object') return {};
  const c = value as Contacts;
  return {
    addresses: normalizeArray(c.addresses),
    phones: normalizeArray(c.phones),
    emails: normalizeArray(c.emails),
  };
}

export function buildPhotoUrl(photoUrl?: string | null, apiUrl?: string): string | null {
  if (!photoUrl) return null;
  if (photoUrl.startsWith('http')) return photoUrl;
  const base = apiUrl?.replace('/api/v1', '');
  if (!base) return null;
  return `${base}${photoUrl}`;
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Non renseignée';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function buildBody(form: FormState): Record<string, any> {
  const professions = [form.profession1.trim(), form.profession2.trim()].filter(Boolean);
  const contacts = {
    addresses: form.address.trim() ? [form.address.trim()] : [],
    phones: form.phone.trim() ? [form.phone.trim()] : [],
    emails: form.emailContact.trim() ? [form.emailContact.trim()] : [],
  };
  const body: Record<string, any> = {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    gender: form.gender,
    is_private: form.isPrivate,
  };
  if (form.birthDate.trim()) body.birth_date = form.birthDate.trim();
  if (form.birthPlace.trim()) body.birth_place = form.birthPlace.trim();
  if (form.deathDate.trim()) body.death_date = form.deathDate.trim();
  if (form.deathPlace.trim()) body.death_place = form.deathPlace.trim();
  if (form.notesPublic.trim()) body.notes_public = form.notesPublic.trim();
  if (form.notesPrivate.trim()) body.notes_private = form.notesPrivate.trim();
  if (professions.length > 0) body.professions = professions;
  if (contacts.addresses.length || contacts.phones.length || contacts.emails.length) {
    body.contacts = contacts;
  }
  return body;
}

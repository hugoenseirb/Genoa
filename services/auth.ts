import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
  };
};

type RegisterResponse = {
  message: string;
  user?: {
    id: string;
    email: string;
    username: string;
    role: string;
    status: string;
    created_at: string;
  };
  token?: string;
};

function getApiUrl(): string {
  if (!API_URL) {
    throw new Error('API_URL introuvable');
  }
  return API_URL;
}

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const baseUrl = getApiUrl();

  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Erreur de connexion');
  }

  return data;
}

export async function registerRequest(
  email: string,
  password: string,
  username: string
): Promise<RegisterResponse> {
  const baseUrl = getApiUrl();

  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, username }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Erreur lors de l'inscription");
  }

  return data;
}
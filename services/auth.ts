import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.apiUrl;

type LoginResponse = {
  token: string;
  user: {
    id: number;
    email: string;
    username: string;
    role: string;
    status: string;
  };
};

type RegisterResponse = {
  message: string;
  user?: {
    id: number;
    email: string;
    username: string;
    role: string;
    status: string;
    created_at: string;
  };
  token?: string;
};

export async function loginRequest(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
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
  const response = await fetch(`${API_URL}/auth/register`, {
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
import { useAuthStore } from '@/store/authStore';

const BASE = '/api';

function getToken(): string | null {
  return useAuthStore.getState().token ?? localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (res.status === 401) {
      useAuthStore.getState().clearAuth();
    }
    const message = data?.message ?? 'Request failed';
    throw new Error(message);
  }

  return data as ApiResponse<T>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

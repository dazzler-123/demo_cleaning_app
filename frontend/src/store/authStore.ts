import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { ROLES } from '@/types';
import { authApi } from '@/api/endpoints';

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  loadUser: () => Promise<void>;
  isAdmin: () => boolean;
  isAgent: () => boolean;
  isSuperAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      setAuth: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token });
      },
      clearAuth: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null });
      },
      loadUser: async () => {
        const { data } = await authApi.me();
        set({ user: data });
      },
      isAdmin: () => {
        const role = get().user?.role;
        return role === ROLES.ADMIN || role === ROLES.SUPER_ADMIN;
      },
      isAgent: () => get().user?.role === ROLES.AGENT,
      isSuperAdmin: () => get().user?.role === ROLES.SUPER_ADMIN,
    }),
    { name: 'auth', partialize: (s) => ({ user: s.user, token: s.token }) }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../api/client';

interface User {
    id: string;
    email: string;
    name: string | null;
    avatar: string | null;
    role: string;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string, name?: string) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
    updateProfile: (data: { name?: string; avatar?: string }) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: true,
            isAuthenticated: false,

            login: async (email: string, password: string) => {
                const { data } = await api.post('/auth/login', { email, password });
                set({
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true,
                });
            },

            register: async (email: string, password: string, name?: string) => {
                const { data } = await api.post('/auth/register', { email, password, name });
                set({
                    user: data.user,
                    token: data.token,
                    isAuthenticated: true,
                });
            },

            logout: () => {
                api.post('/auth/logout').catch(() => { });
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                });
            },

            checkAuth: async () => {
                const { token } = get();
                if (!token) {
                    set({ isLoading: false });
                    return;
                }

                try {
                    const { data } = await api.get('/auth/me');
                    set({
                        user: data.user,
                        isAuthenticated: true,
                        isLoading: false,
                    });
                } catch {
                    set({
                        user: null,
                        token: null,
                        isAuthenticated: false,
                        isLoading: false,
                    });
                }
            },

            updateProfile: async (profileData) => {
                const { data } = await api.patch('/auth/me', profileData);
                set({ user: data.user });
            },
        }),
        {
            name: 'auth-storage',
            partialize: (state) => ({ token: state.token }),
        }
    )
);

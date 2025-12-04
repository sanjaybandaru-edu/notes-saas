import axios from 'axios';
import { useAuthStore } from '../stores/auth';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

// API functions
export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    register: (email: string, password: string, name?: string) =>
        api.post('/auth/register', { email, password, name }),
    logout: () => api.post('/auth/logout'),
    me: () => api.get('/auth/me'),
};

export const topicsApi = {
    list: (params?: { parentId?: string; flat?: boolean }) =>
        api.get('/topics', { params }),
    get: (id: string) => api.get(`/topics/${id}`),
    getBySlug: (slug: string) => api.get(`/topics/slug/${slug}`),
    create: (data: { name: string; slug: string; description?: string; parentId?: string; isPublic?: boolean }) =>
        api.post('/topics', data),
    update: (id: string, data: Partial<{ name: string; slug: string; description?: string; isPublic?: boolean }>) =>
        api.patch(`/topics/${id}`, data),
    delete: (id: string) => api.delete(`/topics/${id}`),
    reorder: (orders: { id: string; order: number }[]) =>
        api.post('/topics/reorder', { orders }),
};

export const notesApi = {
    list: (params?: { topicId?: string; search?: string; limit?: number; offset?: number }) =>
        api.get('/notes', { params }),
    get: (id: string) => api.get(`/notes/${id}`),
    getBySlug: (topicSlug: string, noteSlug: string) =>
        api.get(`/notes/slug/${topicSlug}/${noteSlug}`),
    create: (data: { title: string; slug: string; content: string; topicId: string; isPublic?: boolean; isDraft?: boolean; tags?: string[] }) =>
        api.post('/notes', data),
    update: (id: string, data: Partial<{ title: string; content: string; isPublic?: boolean; isDraft?: boolean; tags?: string[] }>) =>
        api.patch(`/notes/${id}`, data),
    delete: (id: string) => api.delete(`/notes/${id}`),
    getTags: () => api.get('/notes/meta/tags'),
};

export const filesApi = {
    list: (params?: { noteId?: string; limit?: number; offset?: number }) =>
        api.get('/files', { params }),
    upload: (file: File, noteId?: string) => {
        const formData = new FormData();
        formData.append('file', file);
        if (noteId) formData.append('noteId', noteId);
        return api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    },
    getDownloadUrl: (id: string) => api.get(`/files/${id}/download`),
    delete: (id: string) => api.delete(`/files/${id}`),
    getPresignedUrl: (filename: string, contentType: string) =>
        api.post('/files/presigned-url', { filename, contentType }),
};

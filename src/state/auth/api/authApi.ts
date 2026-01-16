import api from '../../../services/api';
import { AuthResponse, LoginCredentials, RegisterData, User } from '../../../types';

export const authApi = {
    register: async (data: RegisterData): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/register', data);
        return response.data;
    },

    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await api.post<AuthResponse>('/auth/login', credentials);
        return response.data;
    },

    getProfile: async (): Promise<User> => {
        const response = await api.get<User>('/auth/profile');
        return response.data;
    },
};

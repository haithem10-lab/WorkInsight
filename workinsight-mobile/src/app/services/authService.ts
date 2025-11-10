import { apiClient } from './apiClient';
import type { SessionUser } from '../store/sessionStore';

export interface SignUpPayload {
  fullName: string;
  email: string;
  password: string;
}

export interface SignInPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: SessionUser;
  accessToken: string;
}

export const AuthService = {
  async signUp(payload: SignUpPayload) {
    const { data } = await apiClient.post<SessionUser>('/auth/signup', payload);
    return data;
  },
  async signIn(payload: SignInPayload) {
    const { data } = await apiClient.post<AuthResponse>('/auth/signin', payload);
    return data;
  },
  async verify(token: string) {
    await apiClient.post<void>('/auth/verify', { token });
  },
  async resendVerification(email: string) {
    await apiClient.post<void>('/auth/verify/resend', { email });
  },
  async requestPasswordReset(email: string) {
    await apiClient.post<void>('/auth/password/forgot', { email });
  },
  async resetPassword(token: string, newPassword: string) {
    await apiClient.post<void>('/auth/password/reset', { token, newPassword });
  }
};

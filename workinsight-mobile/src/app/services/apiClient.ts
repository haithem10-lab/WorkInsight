import axios, { AxiosHeaders } from 'axios';
import Constants from 'expo-constants';
import { getAccessToken, getCurrentUserId } from '../store/sessionStore';

const expoExtra =
  (Constants.expoConfig?.extra as Record<string, any> | undefined) ||
  (Constants.manifest2?.extra as Record<string, any> | undefined) ||
  ((Constants.manifest as any)?.extra as Record<string, any> | undefined);

const baseUrl =
  (expoExtra?.apiBaseUrl as string | undefined) ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://10.0.2.2:8080/api';

export const apiClient = axios.create({
  baseURL: baseUrl,
  timeout: 20000
});

const AUTH_PREFIX = '/auth';

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && !config.url?.includes(AUTH_PREFIX)) {
    const headers = AxiosHeaders.from(config.headers);
    headers.set('Authorization', `Bearer ${token}`);
    config.headers = headers;
  }
  const userId = getCurrentUserId();
  if (userId && !config.url?.includes(AUTH_PREFIX)) {
    config.params = { ...(config.params || {}), userId };
  }
  return config;
});

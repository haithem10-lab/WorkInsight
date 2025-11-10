import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type SessionUser = {
  id: string;
  email: string;
  fullName?: string | null;
  accessToken?: string | null;
  photoData?: string | null;
};

type SessionState = {
  user: SessionUser | null;
  setUser: (user: SessionUser | null) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clear: () => set({ user: null })
    }),
    {
      name: 'workinsight:session',
      storage: createJSONStorage(() => AsyncStorage)
    }
  )
);

export const getAccessToken = () => useSessionStore.getState().user?.accessToken ?? null;
export const getCurrentUserId = () => useSessionStore.getState().user?.id ?? null;


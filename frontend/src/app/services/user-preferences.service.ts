import { Injectable } from '@angular/core';

export interface UserPreferences {
  alertLowConfidence: boolean;
  weeklyDigest: boolean;
}

const STORAGE_KEY = 'workinsight:profile-settings';

const DEFAULT_PREFERENCES: UserPreferences = {
  alertLowConfidence: true,
  weeklyDigest: false
};

@Injectable({ providedIn: 'root' })
export class UserPreferencesService {
  get(userId: string | null | undefined): UserPreferences {
    if (!userId) {
      return { ...DEFAULT_PREFERENCES };
    }
    const store = this.readStore();
    const existing = store[userId];
    return { ...DEFAULT_PREFERENCES, ...(existing ?? {}) };
  }

  overwrite(userId: string, preferences: UserPreferences): void {
    if (!userId || !this.canUseStorage()) {
      return;
    }
    const store = this.readStore();
    store[userId] = { ...DEFAULT_PREFERENCES, ...preferences };
    this.writeStore(store);
  }

  update(userId: string, patch: Partial<UserPreferences>): UserPreferences {
    if (!userId) {
      return { ...DEFAULT_PREFERENCES, ...patch };
    }
    const current = this.get(userId);
    const next = { ...current, ...patch };
    this.overwrite(userId, next);
    return next;
  }

  toggle(userId: string | null | undefined, key: keyof UserPreferences): UserPreferences {
    const current = this.get(userId);
    const next = { ...current, [key]: !current[key] };
    if (userId) {
      this.overwrite(userId, next);
    }
    return next;
  }

  get defaults(): UserPreferences {
    return { ...DEFAULT_PREFERENCES };
  }

  private canUseStorage(): boolean {
    return typeof localStorage !== 'undefined';
  }

  private readStore(): Record<string, UserPreferences> {
    if (!this.canUseStorage()) {
      return {};
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }
    try {
      const parsed = JSON.parse(raw) as Record<string, UserPreferences>;
      return parsed ?? {};
    } catch {
      return {};
    }
  }

  private writeStore(store: Record<string, UserPreferences>): void {
    if (!this.canUseStorage()) {
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }
}

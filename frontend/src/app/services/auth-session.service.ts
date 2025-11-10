import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'workinsight:user';

export interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
  photoData?: string | null;
  accessToken?: string | null;
  roles?: string[];
  accountStatus?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly userSubject = new BehaviorSubject<SessionUser | null>(readStoredUser());
  readonly currentUser$ = this.userSubject.asObservable();

  setCurrentUser(user: SessionUser | null | undefined): void {
    if (!user?.id || !user.email) {
      return;
    }
    const normalized: SessionUser = {
      id: user.id,
      email: user.email.trim().toLowerCase(),
      fullName: user.fullName,
      photoData: user.photoData ?? null,
      accessToken: user.accessToken ?? null,
      roles: normalizeRoles(user.roles),
      accountStatus: user.accountStatus ?? 'ACTIVE'
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    this.userSubject.next(normalized);
  }

  updatePhoto(photoData: string | null): void {
    const current = this.userSubject.value;
    if (!current) {
      return;
    }
    const normalized = photoData ?? null;
    if (current.photoData === normalized) {
      return;
    }
    const updated: SessionUser = {
      ...current,
      photoData: normalized
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    }
    this.userSubject.next(updated);
  }

  getAccessToken(): string | null {
    return this.userSubject.value?.accessToken ?? null;
  }

  getCurrentUser(): SessionUser | null {
    return this.userSubject.value;
  }

  getCurrentUserId(): string | null {
    return this.userSubject.value?.id ?? null;
  }

  clear(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.userSubject.next(null);
  }

  hasRole(role: string): boolean {
    const normalized = role?.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return (this.userSubject.value?.roles ?? []).includes(normalized);
  }

  isAdmin(): boolean {
    return this.hasRole('ROLE_ADMIN');
  }
}

function readStoredUser(): SessionUser | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as SessionUser;
    if (!parsed?.id || !parsed?.email) {
      return null;
    }
    return {
      id: parsed.id,
      email: parsed.email.trim().toLowerCase(),
      fullName: parsed.fullName,
      photoData: parsed.photoData ?? null,
      accessToken: parsed.accessToken ?? null,
      roles: normalizeRoles(parsed.roles),
      accountStatus: parsed.accountStatus ?? 'ACTIVE'
    };
  } catch {
    return null;
  }
}

function normalizeRoles(roles: unknown): string[] {
  if (!Array.isArray(roles)) {
    return ['ROLE_USER'];
  }
  const normalized = roles
    .filter(role => typeof role === 'string')
    .map(role => role.trim())
    .filter(role => role.length > 0)
    .map(role => (role.startsWith('ROLE_') ? role : `ROLE_${role}`));
  return normalized.length > 0 ? Array.from(new Set(normalized)) : ['ROLE_USER'];
}

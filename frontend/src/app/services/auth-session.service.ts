import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

const STORAGE_KEY = 'workinsight:user';

export interface SessionUser {
  id: string;
  email: string;
  fullName?: string;
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
      fullName: user.fullName
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
    this.userSubject.next(normalized);
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
    parsed.email = parsed.email.trim().toLowerCase();
    return parsed;
  } catch {
    return null;
  }
}

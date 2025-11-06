import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'workinsight:theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly themeSubject = new BehaviorSubject<ThemeMode>(readStoredTheme());
  readonly theme$ = this.themeSubject.asObservable();

  setTheme(theme: ThemeMode): void {
    this.themeSubject.next(theme);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, theme);
    }
    applyTheme(theme);
  }

  toggle(): void {
    const next = this.themeSubject.value === 'dark' ? 'light' : 'dark';
    this.setTheme(next);
  }

  getCurrentTheme(): ThemeMode {
    return this.themeSubject.value;
  }
}

function readStoredTheme(): ThemeMode {
  let theme: ThemeMode = 'dark';
  if (typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      theme = stored;
    }
  }
  applyTheme(theme);
  return theme;
}

function applyTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.body.setAttribute('data-theme', theme);
}

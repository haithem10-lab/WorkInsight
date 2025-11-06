import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type UiLanguage = 'en' | 'fr';

const STORAGE_KEY = 'workinsight:language';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly languageSubject = new BehaviorSubject<UiLanguage>(readStoredLanguage());
  readonly language$ = this.languageSubject.asObservable();

  setLanguage(language: UiLanguage): void {
    this.languageSubject.next(language);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, language);
    }
    applyDomLanguage(language);
  }

  getCurrentLanguage(): UiLanguage {
    return this.languageSubject.value;
  }
}

function readStoredLanguage(): UiLanguage {
  if (typeof localStorage === 'undefined') {
    applyDomLanguage('en');
    return 'en';
  }
  const stored = localStorage.getItem(STORAGE_KEY);
  const language: UiLanguage = stored === 'fr' ? 'fr' : 'en';
  applyDomLanguage(language);
  return language;
}

function applyDomLanguage(language: UiLanguage): void {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.setAttribute('lang', language);
  document.documentElement.setAttribute('data-lang', language);
}

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from './i18n';

export type UiLanguage = 'en' | 'fr';

type LanguageContextValue = {
  language: UiLanguage;
  setLanguage: (lang: UiLanguage) => void;
};

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<UiLanguage>((i18n.language as UiLanguage) ?? 'en');

  const setLanguage = (lang: UiLanguage) => {
    i18n.changeLanguage(lang);
    setLanguageState(lang);
  };

  const value = useMemo(() => ({ language, setLanguage }), [language]);

  return (
    <I18nextProvider i18n={i18n}>
      <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
    </I18nextProvider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used inside LanguageProvider');
  }
  return ctx;
}


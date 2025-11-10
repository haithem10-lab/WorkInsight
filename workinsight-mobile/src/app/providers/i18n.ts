import i18n, { type Resource } from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

const resources = {
  en: {
    translation: {
      hero: {
        title: 'Operational intelligence for your job data',
        subtitle: 'Ingest offers, resumes, and insights across every channel.'
      }
    }
  },
  fr: {
    translation: {
      hero: {
        title: 'Intelligence operationnelle pour vos offres',
        subtitle: 'Ingerer les offres, CV et analyses sur tous les canaux.'
      }
    }
  }
} satisfies Resource;

type SupportedLocale = keyof typeof resources;
const fallback: SupportedLocale = 'en';
const locales = typeof Localization.getLocales === 'function' ? Localization.getLocales() : [];
const deviceLocale = locales[0]?.languageCode ?? locales[0]?.languageTag?.split('-')[0];

const isSupportedLocale = (value: string | undefined): value is SupportedLocale =>
  Boolean(value && value in resources);

const resolvedLocale: SupportedLocale = isSupportedLocale(deviceLocale) ? deviceLocale : fallback;

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources,
    lng: resolvedLocale,
    fallbackLng: fallback,
    compatibilityJSON: 'v4',
    interpolation: {
      escapeValue: false
    }
  });
}

export default i18n;

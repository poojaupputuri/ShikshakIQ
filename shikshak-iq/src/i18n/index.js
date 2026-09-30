import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import hi from './locales/hi';
import ta from './locales/ta';
import te from './locales/te';
import kn from './locales/kn';
import ml from './locales/ml';
import mr from './locales/mr';
import bn from './locales/bn';
import gu from './locales/gu';
import or from './locales/or';
import pa from './locales/pa';

const storedLang = localStorage.getItem('i18nextLng') || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      ta: { translation: ta },
      te: { translation: te },
      kn: { translation: kn },
      ml: { translation: ml },
      mr: { translation: mr },
      bn: { translation: bn },
      gu: { translation: gu },
      or: { translation: or },
      pa: { translation: pa },
    },
    lng: storedLang,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;

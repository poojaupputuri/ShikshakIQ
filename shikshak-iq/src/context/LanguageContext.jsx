import { createContext, useContext, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export const languages = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback((code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('i18nextLng', code);
  }, [i18n]);

  useEffect(() => {
    const stored = localStorage.getItem('i18nextLng');
    if (stored && stored !== i18n.language) {
      i18n.changeLanguage(stored);
    }
  }, [i18n]);

  const currentLanguage = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <LanguageContext.Provider
      value={{ currentLanguage, changeLanguage, languages }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;

import { useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { LanguageContext } from '@/contexts/LanguageContext';

const useLanguage = () => {
  const { t, i18n } = useTranslation();
  const languageContext = useContext(LanguageContext);

  if (!languageContext) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  const { currentLanguage, changeLanguage, isRTL } = languageContext;

  return {
    t,
    i18n,
    currentLanguage,
    changeLanguage,
    isRTL,
  };
};

export default useLanguage;
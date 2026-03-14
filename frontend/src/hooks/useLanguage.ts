import { useTranslation } from 'react-i18next';
import { usePreferences } from '@/contexts/PreferencesContext';

const useLanguage = () => {
  const { t, i18n } = useTranslation();
  // Using PreferencesContext as the single source of truth for language settings
  // to avoid provider nesting issues
  const { currentLanguage, changeLanguage, isRTL } = usePreferences();

  return {
    t,
    i18n,
    currentLanguage,
    changeLanguage,
    isRTL,
  };
};

export default useLanguage;
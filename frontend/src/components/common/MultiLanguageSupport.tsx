import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  FaGlobe,
  FaChevronDown
} from 'react-icons/fa';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

interface TranslationContextType {
  currentLanguage: Language;
  setLanguage: (language: Language) => void;
  t: (key: string, params?: Record<string, string>) => string;
  languages: Language[];
  isLoading: boolean;
}

const languages: Language[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸'
  },
  {
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇦🇪',
    rtl: true
  },
  {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷'
  },
  {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸'
  },
  {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪'
  },
  {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिंदी',
    flag: '🇮🇳'
  },
  {
    code: 'ur',
    name: 'Urdu',
    nativeName: 'اردو',
    flag: '🇵🇰',
    rtl: true
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳'
  },
  {
    code: 'ru',
    name: 'Russian',
    nativeName: 'Русский',
    flag: '🇷🇺'
  }
];

// Sample translations - In a real app, these would be loaded from translation files
const translations: Record<string, Record<string, string>> = {
  en: {
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.price': 'Price',
    'common.date': 'Date',
    'common.location': 'Location',
    'common.category': 'Category',
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
    'nav.home': 'Home',
    'nav.events': 'Events',
    'nav.venues': 'Venues',
    'nav.bookings': 'My Bookings',
    'nav.wishlist': 'Wishlist',
    'nav.profile': 'Profile',
    'events.upcoming': 'Upcoming Events',
    'events.featured': 'Featured Events',
    'events.book_now': 'Book Now',
    'events.add_to_wishlist': 'Add to Wishlist',
    'booking.confirm': 'Confirm Booking',
    'booking.payment': 'Payment',
    'booking.success': 'Booking Confirmed!'
  },
  ar: {
    'common.search': 'بحث',
    'common.filter': 'تصفية',
    'common.sort': 'ترتيب',
    'common.price': 'السعر',
    'common.date': 'التاريخ',
    'common.location': 'الموقع',
    'common.category': 'الفئة',
    'common.save': 'حفظ',
    'common.cancel': 'إلغاء',
    'common.loading': 'جاري التحميل...',
    'common.error': 'خطأ',
    'common.success': 'نجح',
    'nav.home': 'الرئيسية',
    'nav.events': 'الفعاليات',
    'nav.venues': 'الأماكن',
    'nav.bookings': 'حجوزاتي',
    'nav.wishlist': 'المفضلة',
    'nav.profile': 'الملف الشخصي',
    'events.upcoming': 'الفعاليات القادمة',
    'events.featured': 'الفعاليات المميزة',
    'events.book_now': 'احجز الآن',
    'events.add_to_wishlist': 'إضافة للمفضلة',
    'booking.confirm': 'تأكيد الحجز',
    'booking.payment': 'الدفع',
    'booking.success': 'تم تأكيد الحجز!'
  },
  fr: {
    'common.search': 'Rechercher',
    'common.filter': 'Filtrer',
    'common.sort': 'Trier',
    'common.price': 'Prix',
    'common.date': 'Date',
    'common.location': 'Lieu',
    'common.category': 'Catégorie',
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.loading': 'Chargement...',
    'common.error': 'Erreur',
    'common.success': 'Succès',
    'nav.home': 'Accueil',
    'nav.events': 'Événements',
    'nav.venues': 'Lieux',
    'nav.bookings': 'Mes Réservations',
    'nav.wishlist': 'Liste de Souhaits',
    'nav.profile': 'Profil',
    'events.upcoming': 'Événements à Venir',
    'events.featured': 'Événements en Vedette',
    'events.book_now': 'Réserver Maintenant',
    'events.add_to_wishlist': 'Ajouter aux Favoris',
    'booking.confirm': 'Confirmer la Réservation',
    'booking.payment': 'Paiement',
    'booking.success': 'Réservation Confirmée!'
  }
};

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};

interface TranslationProviderProps {
  children: React.ReactNode;
  defaultLanguage?: string;
}

export const TranslationProvider: React.FC<TranslationProviderProps> = ({
  children,
  defaultLanguage = 'en'
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>(
    languages.find(lang => lang.code === defaultLanguage) || languages[0]
  );
  const [isLoading, setIsLoading] = useState(false);

  // Load saved language preference
  useEffect(() => {
    const savedLanguageCode = localStorage.getItem('selectedLanguage');
    if (savedLanguageCode) {
      const savedLanguage = languages.find(lang => lang.code === savedLanguageCode);
      if (savedLanguage) {
        setCurrentLanguage(savedLanguage);
      }
    }
  }, []);

  // Update document direction and language
  useEffect(() => {
    document.documentElement.lang = currentLanguage.code;
    document.documentElement.dir = currentLanguage.rtl ? 'rtl' : 'ltr';
    
    // Update CSS custom properties for RTL support
    if (currentLanguage.rtl) {
      document.documentElement.style.setProperty('--text-align-start', 'right');
      document.documentElement.style.setProperty('--text-align-end', 'left');
    } else {
      document.documentElement.style.setProperty('--text-align-start', 'left');
      document.documentElement.style.setProperty('--text-align-end', 'right');
    }
  }, [currentLanguage]);

  const setLanguage = async (language: Language) => {
    setIsLoading(true);
    
    // Simulate loading translations
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setCurrentLanguage(language);
    localStorage.setItem('selectedLanguage', language.code);
    setIsLoading(false);
  };

  const t = (key: string, params?: Record<string, string>): string => {
    const translation = translations[currentLanguage.code]?.[key] || 
                       translations['en'][key] || 
                       key;

    if (params) {
      return Object.keys(params).reduce((text, param) => {
        return text.replace(new RegExp(`{{${param}}}`, 'g'), params[param]);
      }, translation);
    }

    return translation;
  };

  const contextValue: TranslationContextType = {
    currentLanguage,
    setLanguage,
    t,
    languages,
    isLoading
  };

  return (
    <TranslationContext.Provider value={contextValue}>
      {children}
    </TranslationContext.Provider>
  );
};

interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  className = '',
  compact = false
}) => {
  const { currentLanguage, setLanguage, languages, isLoading } = useTranslation();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLanguageSelect = (language: Language) => {
    setLanguage(language);
    setShowDropdown(false);
  };

  if (compact) {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          disabled={isLoading}
          className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          <span>{currentLanguage.flag}</span>
          <span className="hidden sm:inline">{currentLanguage.code.toUpperCase()}</span>
          <FaChevronDown size={12} className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
        </button>

        {showDropdown && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
            <div className="py-1 max-h-60 overflow-y-auto">
              {languages.map((language) => (
                <button
                  key={language.code}
                  onClick={() => handleLanguageSelect(language)}
                  className={`w-full flex items-center justify-between px-4 py-2 text-sm hover:bg-gray-100 ${
                    currentLanguage.code === language.code ? 'bg-blue-50 text-blue-600' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{language.flag}</span>
                    <div className="text-left">
                      <div className="font-medium">{language.name}</div>
                      <div className="text-xs text-gray-500">{language.nativeName}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FaGlobe className="text-gray-600" size={20} />
            <h3 className="text-lg font-medium text-gray-900">Language / اللغة</h3>
          </div>
          {isLoading && (
            <div className="flex items-center space-x-2 text-sm text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span>Loading...</span>
            </div>
          )}
        </div>
      </div>

      {/* Selected Language Display */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{currentLanguage.flag}</span>
            <div>
              <div className="font-medium text-gray-900">{currentLanguage.name}</div>
              <div className="text-sm text-gray-500">{currentLanguage.nativeName}</div>
            </div>
          </div>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Change
            <FaChevronDown size={12} className={`ml-2 transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Language List */}
      {showDropdown && (
        <div className="p-2">
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleLanguageSelect(language)}
                disabled={isLoading}
                className={`w-full flex items-center justify-between p-3 rounded-md hover:bg-gray-100 transition-colors disabled:opacity-50 ${
                  currentLanguage.code === language.code ? 'bg-blue-50 ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-lg">{language.flag}</span>
                  <div className="text-left">
                    <div className="font-medium text-gray-900">{language.name}</div>
                    <div className="text-sm text-gray-500">{language.nativeName}</div>
                  </div>
                </div>
                {language.rtl && (
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">RTL</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
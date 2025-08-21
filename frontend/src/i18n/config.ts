import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// English translations
const enTranslations = {
  common: {
    appName: 'Gema',
    loading: 'Loading...',
    error: 'An error occurred',
    retry: 'Retry',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    search: 'Search',
    filter: 'Filter',
    sort: 'Sort',
    all: 'All',
    more: 'More',
    less: 'Less',
    seeMore: 'See More',
    seeLess: 'See Less',
    viewAll: 'View All',
  },
  navigation: {
    home: 'Home',
    events: 'Events',
    categories: 'Categories',
    vendors: 'Vendors',
    bookings: 'My Bookings',
    favorites: 'Favorites',
    profile: 'Profile',
    settings: 'Settings',
    login: 'Login',
    register: 'Register',
    logout: 'Logout',
  },
  auth: {
    login: 'Login',
    register: 'Register',
    forgotPassword: 'Forgot Password',
    resetPassword: 'Reset Password',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    name: 'Name',
    firstName: 'First Name',
    lastName: 'Last Name',
    phone: 'Phone',
    rememberMe: 'Remember Me',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: 'Don\'t have an account?',
    createAccount: 'Create Account',
    loginSuccess: 'Login successful',
    registerSuccess: 'Registration successful',
    logoutSuccess: 'Logout successful',
  },
  events: {
    title: 'Events',
    featured: 'Featured Events',
    popular: 'Popular Events',
    upcoming: 'Upcoming Events',
    recommended: 'Recommended for You',
    nearYou: 'Near You',
    price: 'Price',
    date: 'Date',
    time: 'Time',
    location: 'Location',
    description: 'Description',
    details: 'Details',
    book: 'Book Now',
    share: 'Share',
    favorite: 'Favorite',
    unfavorite: 'Unfavorite',
    reviews: 'Reviews',
    writeReview: 'Write a Review',
    noEvents: 'No events found',
  },
  bookings: {
    title: 'My Bookings',
    upcoming: 'Upcoming',
    past: 'Past',
    cancelled: 'Cancelled',
    bookingId: 'Booking ID',
    status: 'Status',
    date: 'Date',
    time: 'Time',
    tickets: 'Tickets',
    totalPrice: 'Total Price',
    paymentMethod: 'Payment Method',
    viewDetails: 'View Details',
    cancelBooking: 'Cancel Booking',
    noBookings: 'No bookings found',
  },
};

// Arabic translations (simplified example)
const arTranslations = {
  common: {
    appName: 'جيما',
    loading: 'جار التحميل...',
    error: 'حدث خطأ',
    retry: 'إعادة المحاولة',
    save: 'حفظ',
    cancel: 'إلغاء',
    confirm: 'تأكيد',
    back: 'رجوع',
    next: 'التالي',
    search: 'بحث',
    filter: 'تصفية',
    sort: 'ترتيب',
    all: 'الكل',
    more: 'المزيد',
    less: 'أقل',
    seeMore: 'عرض المزيد',
    seeLess: 'عرض أقل',
    viewAll: 'عرض الكل',
  },
  navigation: {
    home: 'الرئيسية',
    events: 'الفعاليات',
    categories: 'الفئات',
    vendors: 'المنظمين',
    bookings: 'حجوزاتي',
    favorites: 'المفضلة',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    login: 'تسجيل الدخول',
    register: 'التسجيل',
    logout: 'تسجيل الخروج',
  },
  // Add more Arabic translations as needed
};

i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: enTranslations,
      ar: arTranslations,
    },
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
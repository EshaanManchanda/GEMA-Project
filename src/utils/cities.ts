/**
 * Static city lists for countries
 * Used to populate city dropdowns even if no events exist
 */

export interface CityList {
  [countryCode: string]: string[];
}

/**
 * United Arab Emirates - All major cities and areas
 * Organized by Emirate
 */
export const UAE_CITIES = [
  // Abu Dhabi Emirate
  "Abu Dhabi",
  "Al Ain",
  "Madinat Zayed",
  "Ruwais",
  "Liwa Oasis",
  "Ghayathi",
  "Al Wathba",
  "Baniyas",
  "Mussafah",
  "Khalifa City",
  "Al Shamkha",
  "Al Bahia",
  "Yas Island",
  "Saadiyat Island",

  // Dubai Emirate
  "Dubai",
  "Deira",
  "Bur Dubai",
  "Jumeirah",
  "Dubai Marina",
  "Downtown Dubai",
  "Business Bay",
  "Dubai Silicon Oasis",
  "International City",
  "Dubai Investment Park",
  "Jebel Ali",
  "Al Barsha",
  "Al Quoz",
  "Al Karama",
  "Al Satwa",
  "Nad Al Sheba",
  "Mirdif",
  "Al Warqa",
  "Al Rashidiya",
  "Arabian Ranches",
  "Dubai Sports City",
  "Motor City",
  "Discovery Gardens",
  "Dubai Festival City",
  "Jumeirah Village Circle",
  "Jumeirah Village Triangle",
  "Dubai Healthcare City",
  "Dubai Internet City",
  "Dubai Media City",
  "Dubai Knowledge Park",
  "Dubai Production City",
  "Dubai Studio City",
  "DIFC",
  "Dubai Design District",
  "City Walk",

  // Sharjah Emirate
  "Sharjah",
  "Khor Fakkan",
  "Kalba",
  "Dibba Al Hisn",
  "Al Dhaid",
  "Mleiha",
  "Al Madam",
  "Al Hamriyah",
  "Muweilah",
  "Al Majaz",
  "Al Khan",
  "Al Nahda",
  "Al Qasimia",
  "Al Taawun",
  "University City",

  // Ajman Emirate
  "Ajman",
  "Manama",
  "Masfout",
  "Al Nuaimia",
  "Al Rashidiya",
  "Al Bustan",

  // Umm Al Quwain Emirate
  "Umm Al Quwain",
  "Falaj Al Mualla",

  // Ras Al Khaimah Emirate
  "Ras Al Khaimah",
  "Digdaga",
  "Dafan Al Khor",
  "Khuzam",
  "Al Jazirah Al Hamra",
  "Al Hamra Village",
  "Al Qusaidat",
  "Al Dhait",

  // Fujairah Emirate
  "Fujairah",
  "Dibba Al Fujairah",
  "Bidiya",
  "Qidfa",
  "Al Aqah",
  "Mirbah",
  "Masafi",
].sort((a, b) => a.localeCompare(b)); // Alphabetical order

/**
 * Static city lists by country code
 */
export const STATIC_CITIES: CityList = {
  AE: UAE_CITIES,
  // Add more countries as needed
  // US: [...],
  // GB: [...],
};

/**
 * Get static cities for a country
 */
export const getStaticCities = (countryCode: string): string[] => {
  return STATIC_CITIES[countryCode.toUpperCase()] || [];
};

/**
 * Check if a country has static cities defined
 */
export const hasStaticCities = (countryCode: string): boolean => {
  return !!STATIC_CITIES[countryCode.toUpperCase()];
};

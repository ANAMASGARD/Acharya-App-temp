import type { TeachingLanguage } from "@/types/language";

const LANGUAGES: TeachingLanguage[] = [
  {
    id: "hi-IN",
    nameEnglish: "Hindi",
    nameNative: "हिन्दी",
    sarvamCode: "hi-IN",
    popular: true,
  },
  {
    id: "en-IN",
    nameEnglish: "English",
    nameNative: "English",
    sarvamCode: "en-IN",
    popular: true,
  },
  {
    id: "ta-IN",
    nameEnglish: "Tamil",
    nameNative: "தமிழ்",
    sarvamCode: "ta-IN",
    popular: true,
  },
  {
    id: "te-IN",
    nameEnglish: "Telugu",
    nameNative: "తెలుగు",
    sarvamCode: "te-IN",
    popular: true,
  },
  {
    id: "bn-IN",
    nameEnglish: "Bengali",
    nameNative: "বাংলা",
    sarvamCode: "bn-IN",
    popular: true,
  },
  {
    id: "mr-IN",
    nameEnglish: "Marathi",
    nameNative: "मराठी",
    sarvamCode: "mr-IN",
    popular: true,
  },
  {
    id: "kn-IN",
    nameEnglish: "Kannada",
    nameNative: "ಕನ್ನಡ",
    sarvamCode: "kn-IN",
  },
  {
    id: "ml-IN",
    nameEnglish: "Malayalam",
    nameNative: "മലയാളം",
    sarvamCode: "ml-IN",
  },
  {
    id: "gu-IN",
    nameEnglish: "Gujarati",
    nameNative: "ગુજરાતી",
    sarvamCode: "gu-IN",
  },
  {
    id: "pa-IN",
    nameEnglish: "Punjabi",
    nameNative: "ਪੰਜਾਬੀ",
    sarvamCode: "pa-IN",
  },
  {
    id: "od-IN",
    nameEnglish: "Odia",
    nameNative: "ଓଡ଼ିଆ",
    sarvamCode: "od-IN",
  },
  {
    id: "as-IN",
    nameEnglish: "Assamese",
    nameNative: "অসমীয়া",
    sarvamCode: "as-IN",
  },
  {
    id: "kok-IN",
    nameEnglish: "Konkani",
    nameNative: "कोंकणी",
    sarvamCode: "kok-IN",
  },
  {
    id: "mai-IN",
    nameEnglish: "Maithili",
    nameNative: "मैथिली",
    sarvamCode: "mai-IN",
  },
  {
    id: "sd-IN",
    nameEnglish: "Sindhi",
    nameNative: "سنڌي",
    sarvamCode: "sd-IN",
  },
  {
    id: "sa-IN",
    nameEnglish: "Sanskrit",
    nameNative: "संस्कृतम्",
    sarvamCode: "sa-IN",
  },
  {
    id: "ne-IN",
    nameEnglish: "Nepali",
    nameNative: "नेपाली",
    sarvamCode: "ne-IN",
  },
  {
    id: "doi-IN",
    nameEnglish: "Dogri",
    nameNative: "डोगरी",
    sarvamCode: "doi-IN",
  },
  {
    id: "brx-IN",
    nameEnglish: "Bodo",
    nameNative: "बड़ो",
    sarvamCode: "brx-IN",
  },
  {
    id: "mni-IN",
    nameEnglish: "Manipuri",
    nameNative: "মৈতৈলোন্",
    sarvamCode: "mni-IN",
  },
  {
    id: "sat-IN",
    nameEnglish: "Santali",
    nameNative: "ᱥᱟᱱᱛᱟᱲᱤ",
    sarvamCode: "sat-IN",
  },
  {
    id: "ks-IN",
    nameEnglish: "Kashmiri",
    nameNative: "کٲشُر",
    sarvamCode: "ks-IN",
  },
  {
    id: "ur-IN",
    nameEnglish: "Urdu",
    nameNative: "اردو",
    sarvamCode: "ur-IN",
  },
];

export const allLanguages: readonly TeachingLanguage[] = LANGUAGES;

export const popularLanguages: readonly TeachingLanguage[] = LANGUAGES.filter(
  (lang) => lang.popular === true,
);

export function getLanguageById(id: string): TeachingLanguage | undefined {
  return LANGUAGES.find((lang) => lang.id === id);
}

export function filterLanguages(query: string): TeachingLanguage[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) {
    return [...LANGUAGES];
  }

  return LANGUAGES.filter(
    (lang) =>
      lang.nameEnglish.toLowerCase().includes(trimmed) ||
      lang.nameNative.toLowerCase().includes(trimmed) ||
      lang.sarvamCode.toLowerCase().includes(trimmed),
  );
}

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import translations, { Lang } from "./translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem("uniflex_lang");
    return (stored === "en" || stored === "fr") ? stored : "fr";
  });

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem("uniflex_lang", l);
  }, []);

  // Also sync to Supabase user_preferences if available
  useEffect(() => {
    localStorage.setItem("uniflex_lang", lang);
  }, [lang]);

  const t = useCallback((key: string, fallback?: string): string => {
    const entry = translations[key];
    if (!entry) return fallback ?? key;
    return entry[lang] ?? entry.fr ?? fallback ?? key;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

export function useT() {
  const { t } = useContext(LanguageContext);
  return t;
}

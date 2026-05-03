import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert, I18nManager } from "react-native";

import {
  type LanguageCode,
  type TranslationKeys,
  interpolate,
  translations,
} from "@/constants/translations";

const LANG_KEY = "intensive_language_v1";

interface LanguageContextType {
  language: LanguageCode;
  isRTL: boolean;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: keyof TranslationKeys, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      if (saved === "en" || saved === "ar") {
        setLanguageState(saved);
      }
    });
  }, []);

  const setLanguage = useCallback(async (lang: LanguageCode) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);

    const needsRTL = lang === "ar";
    const currentRTL = I18nManager.isRTL;

    if (needsRTL !== currentRTL) {
      I18nManager.allowRTL(needsRTL);
      I18nManager.forceRTL(needsRTL);

      Alert.alert(
        lang === "ar" ? "إعادة التشغيل مطلوبة" : "Restart required",
        lang === "ar"
          ? "سيُعاد تشغيل التطبيق لتطبيق تغييرات اللغة والتخطيط."
          : "Please restart the app to apply the RTL layout change.",
        [
          {
            text: lang === "ar" ? "موافق" : "OK",
            onPress: () => {
              try {
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const Updates = require("expo-updates");
                Updates.reloadAsync?.();
              } catch {
                // expo-updates not available — user must restart manually
              }
            },
          },
        ],
      );
    }
  }, []);

  const t = useCallback(
    (key: keyof TranslationKeys, vars?: Record<string, string | number>): string => {
      const dict = translations[language] as Record<string, string>;
      const fallback = translations.en as Record<string, string>;
      const raw = dict[key as string] ?? fallback[key as string] ?? String(key);
      return vars ? interpolate(raw, vars) : raw;
    },
    [language],
  );

  const isRTL = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

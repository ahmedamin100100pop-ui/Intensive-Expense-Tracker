import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Alert, I18nManager, Text } from "react-native";

import {
  type LanguageCode,
  type TranslationKeys,
  interpolate,
  translations,
} from "@/constants/translations";
import { CAIRO_FONTS, INTER_FONTS } from "@/constants/fonts";

const LANG_KEY = "intensive_language_v1";

// ── Font application ──────────────────────────────────────────────────────────
// Map fontWeight values to the correct Cairo or Inter variant so that bold
// headings and body text each get the right weight of the chosen typeface.

function applyGlobalFont(lang: LanguageCode) {
  const isAr = lang === "ar";

  // React Native's Text.defaultProps lets us inject a default style for every
  // Text component rendered in the tree without touching individual files.
  // We set the base fontFamily here; components that don't override fontFamily
  // will automatically pick up the language-correct typeface.
  (Text as unknown as { defaultProps: { style?: object } }).defaultProps =
    (Text as unknown as { defaultProps?: { style?: object } }).defaultProps ?? {};

  (Text as unknown as { defaultProps: { style: object } }).defaultProps.style = isAr
    ? { fontFamily: CAIRO_FONTS.regular }
    : { fontFamily: INTER_FONTS.regular };
}

// ── Context type ─────────────────────────────────────────────────────────────

interface LanguageContextType {
  language: LanguageCode;
  isRTL: boolean;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: keyof TranslationKeys, vars?: Record<string, string | number>) => string;
  /** Returns the Cairo or Inter font family name for a given semantic weight. */
  arabicFont: (weight: "regular" | "semibold" | "bold") => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");

  // Apply saved language on mount
  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY).then((saved) => {
      const lang: LanguageCode = saved === "ar" ? "ar" : "en";
      setLanguageState(lang);
      applyGlobalFont(lang);
    });
  }, []);

  const setLanguage = useCallback(async (lang: LanguageCode) => {
    await AsyncStorage.setItem(LANG_KEY, lang);
    setLanguageState(lang);
    applyGlobalFont(lang);

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

  const arabicFont = useCallback(
    (weight: "regular" | "semibold" | "bold"): string => {
      if (language === "ar") return CAIRO_FONTS[weight];
      const map = { regular: INTER_FONTS.regular, semibold: INTER_FONTS.semibold, bold: INTER_FONTS.bold } as const;
      return map[weight];
    },
    [language],
  );

  const isRTL = language === "ar";

  return (
    <LanguageContext.Provider value={{ language, isRTL, setLanguage, t, arabicFont }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}

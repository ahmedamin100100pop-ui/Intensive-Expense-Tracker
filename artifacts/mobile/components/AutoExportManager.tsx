/**
 * AutoExportManager — runs silently on app open.
 * If auto-backup is enabled and the interval has elapsed, it writes a backup
 * to the device's Documents folder and shows a one-line alert.
 * Renders nothing visible.
 */
import React, { useEffect, useRef } from "react";
import { Alert, Platform } from "react-native";

import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import {
  DEFAULT_AUTO_EXPORT_PREFS,
  getAutoExportPrefs,
  runSilentExport,
  saveAutoExportPrefs,
  shouldRunAutoExport,
} from "@/utils/autoExport";

export function AutoExportManager() {
  const { expenses, userProfile, categoryBudgets } = useApp();
  const { language, t } = useLanguage();
  const ran = useRef(false);

  useEffect(() => {
    // Only run once per app session and only on native
    if (ran.current || Platform.OS === "web") return;
    ran.current = true;

    (async () => {
      try {
        const prefs = await getAutoExportPrefs();
        if (!shouldRunAutoExport(prefs)) return;

        const fileName = await runSilentExport(
          expenses,
          userProfile,
          categoryBudgets,
          language,
        );

        if (!fileName) return;

        // Update last-exported timestamp
        await saveAutoExportPrefs({
          ...prefs,
          lastExportedAt: new Date().toISOString(),
        });

        Alert.alert(
          t("autoBackupSavedTitle"),
          t("autoBackupSavedMsg", { filename: fileName }),
          [{ text: t("ok") }],
        );
      } catch {
        // Silently ignore errors — auto-export must never crash the app
      }
    })();
    // Intentionally only runs once on mount — deps array is empty
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

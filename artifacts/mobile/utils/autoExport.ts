import AsyncStorage from "@react-native-async-storage/async-storage";
import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { LanguageCode } from "@/constants/translations";
import type { CategoryBudget, Expense, UserProfile } from "@/context/AppContext";

// ── Types ─────────────────────────────────────────────────────────────────────

export type AutoExportInterval = "off" | "daily" | "weekly" | "monthly";

export interface AutoExportPrefs {
  interval: AutoExportInterval;
  lastExportedAt: string | null;
}

// ── Storage key ───────────────────────────────────────────────────────────────

const PREFS_KEY = "intensive_auto_export_prefs_v1";

export const DEFAULT_AUTO_EXPORT_PREFS: AutoExportPrefs = {
  interval: "off",
  lastExportedAt: null,
};

// ── Preferences CRUD ──────────────────────────────────────────────────────────

export async function getAutoExportPrefs(): Promise<AutoExportPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    return raw
      ? { ...DEFAULT_AUTO_EXPORT_PREFS, ...JSON.parse(raw) }
      : DEFAULT_AUTO_EXPORT_PREFS;
  } catch {
    return DEFAULT_AUTO_EXPORT_PREFS;
  }
}

export async function saveAutoExportPrefs(prefs: AutoExportPrefs): Promise<void> {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

// ── Due-check ─────────────────────────────────────────────────────────────────

const INTERVAL_MS: Record<Exclude<AutoExportInterval, "off">, number> = {
  daily:   24 * 60 * 60 * 1000,
  weekly:  7  * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

export function shouldRunAutoExport(prefs: AutoExportPrefs): boolean {
  if (prefs.interval === "off") return false;
  if (!prefs.lastExportedAt) return true;
  const elapsed = Date.now() - new Date(prefs.lastExportedAt).getTime();
  return elapsed >= INTERVAL_MS[prefs.interval];
}

// ── Silent export (no share sheet) ────────────────────────────────────────────

/**
 * Silently writes a backup JSON to the app's Documents directory on native.
 * On web the feature is skipped (returns null) — background downloads are
 * not possible without a user gesture in a browser.
 *
 * @returns the filename that was written, or null on web / error
 */
export async function runSilentExport(
  expenses: Expense[],
  userProfile: UserProfile | null,
  categoryBudgets: CategoryBudget[],
  language: LanguageCode,
): Promise<string | null> {
  if (Platform.OS === "web") return null;

  const payload = {
    version: 1,
    appName: "Intensive",
    exportedAt: new Date().toISOString(),
    language,
    countryCode: userProfile?.countryCode,
    expenses,
    userProfile,
    categoryBudgets,
  };

  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `intensive-backup-${dateStr}.json`;
  const jsonStr = JSON.stringify(payload, null, 2);

  try {
    const file = new File(Paths.document, fileName);
    file.write(jsonStr);
    return fileName;
  } catch {
    return null;
  }
}

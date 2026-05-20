import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { LanguageCode } from "@/constants/translations";
import type { CategoryBudget, Expense, UserProfile } from "@/context/AppContext";

const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  appName: string;
  language?: LanguageCode;
  countryCode?: string;
  expenses: Expense[];
  userProfile: UserProfile | null;
  categoryBudgets: CategoryBudget[];
}

// ── Web helpers ───────────────────────────────────────────────────────────────

function webDownloadJson(jsonStr: string, fileName: string): void {
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function webPickJsonFile(): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json,text/plain";
    input.style.display = "none";
    document.body.appendChild(input);

    input.onchange = () => {
      const file = input.files?.[0];
      document.body.removeChild(input);
      if (!file) { reject(new Error("CANCELLED")); return; }

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target?.result as string) as BackupData;
          if (!data || !Array.isArray(data.expenses)) {
            reject(new Error('This file does not appear to be an Intensive backup (missing "expenses" field).'));
          } else {
            resolve(data);
          }
        } catch {
          reject(new Error("The selected file is not valid JSON."));
        }
      };
      reader.onerror = () => reject(new Error("Failed to read file."));
      reader.readAsText(file);
    };

    window.addEventListener(
      "focus",
      () => {
        setTimeout(() => {
          if (!input.files?.length) {
            try { document.body.removeChild(input); } catch {}
            reject(new Error("CANCELLED"));
          }
        }, 500);
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}

// ── Native helpers ────────────────────────────────────────────────────────────

async function nativeExport(jsonStr: string, fileName: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) throw new Error("Sharing is not available on this device.");

  const file = new File(Paths.cache, fileName);
  file.write(jsonStr);

  await Sharing.shareAsync(file.uri, {
    mimeType: "application/json",
    dialogTitle: `Intensive Backup – ${fileName}`,
  });
}

async function nativeImport(): Promise<BackupData> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    throw new Error("CANCELLED");
  }

  const picked = new File(result.assets[0].uri);
  const raw = await picked.text();

  let data: BackupData;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  if (!data || !Array.isArray(data.expenses)) {
    throw new Error('This file does not appear to be an Intensive backup (missing "expenses" field).');
  }

  return data;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function exportBackup(
  expenses: Expense[],
  userProfile: UserProfile | null,
  categoryBudgets: CategoryBudget[],
  language: LanguageCode = "en",
): Promise<void> {
  const payload: BackupData = {
    version: BACKUP_VERSION,
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

  if (Platform.OS === "web") {
    webDownloadJson(jsonStr, fileName);
  } else {
    await nativeExport(jsonStr, fileName);
  }
}

export async function importBackup(): Promise<BackupData> {
  if (Platform.OS === "web") {
    return webPickJsonFile();
  }
  return nativeImport();
}

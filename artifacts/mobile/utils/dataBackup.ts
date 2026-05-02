import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";

import type { CategoryBudget, Expense, UserProfile } from "@/context/AppContext";

const BACKUP_VERSION = 1;

export interface BackupData {
  version: number;
  exportedAt: string;
  appName: string;
  expenses: Expense[];
  userProfile: UserProfile | null;
  categoryBudgets: CategoryBudget[];
}

export async function exportBackup(
  expenses: Expense[],
  userProfile: UserProfile | null,
  categoryBudgets: CategoryBudget[],
): Promise<void> {
  const payload: BackupData = {
    version: BACKUP_VERSION,
    appName: "Intensive",
    exportedAt: new Date().toISOString(),
    expenses,
    userProfile,
    categoryBudgets,
  };

  const dateStr = new Date().toISOString().split("T")[0];
  const fileName = `intensive-backup-${dateStr}.json`;
  const fileUri = (FileSystem.documentDirectory ?? FileSystem.cacheDirectory ?? "") + fileName;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(payload, null, 2), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: "application/json",
      dialogTitle: `Intensive Backup – ${dateStr}`,
    });
  } else {
    throw new Error("Sharing is not available on this device.");
  }
}

export async function importBackup(): Promise<BackupData> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/plain", "*/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets?.length) {
    throw new Error("CANCELLED");
  }

  const uri = result.assets[0].uri;
  const raw = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

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

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { exportBackup, importBackup } from "@/utils/dataBackup";

type Status = "idle" | "exporting" | "importing";

function Row({
  icon, label, sublabel, onPress, rightIcon = "chevron-right", tint, col,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  rightIcon?: keyof typeof Feather.glyphMap;
  tint?: string;
  col: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: col.border }]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={[styles.rowIcon, { backgroundColor: tint ? tint + "18" : col.secondary }]}>
        <Feather name={icon} size={17} color={tint ?? col.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, { color: tint ?? col.foreground }]}>{label}</Text>
        {sublabel ? <Text style={[styles.rowSublabel, { color: col.mutedForeground }]}>{sublabel}</Text> : null}
      </View>
      <Feather name={rightIcon} size={16} color={col.mutedForeground} />
    </TouchableOpacity>
  );
}

export default function SettingsScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, setUserProfile, expenses, categoryBudgets, restoreBackup, clearAllData } = useApp();
  const [status, setStatus] = useState<Status>("idle");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  // Profile edit state
  const [editName, setEditName] = useState(userProfile?.name ?? "");
  const [editIncome, setEditIncome] = useState(String(userProfile?.monthlyIncome ?? ""));
  const [editBudget, setEditBudget] = useState(String(userProfile?.monthlyBudget ?? ""));
  const [profileDirty, setProfileDirty] = useState(false);

  const markDirty = () => setProfileDirty(true);

  const saveProfile = () => {
    if (!userProfile) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUserProfile({
      ...userProfile,
      name: editName.trim() || userProfile.name,
      monthlyIncome: parseFloat(editIncome) || userProfile.monthlyIncome,
      monthlyBudget: parseFloat(editBudget) || userProfile.monthlyBudget,
    });
    setProfileDirty(false);
  };

  const handleExport = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStatus("exporting");
      await exportBackup(expenses, userProfile, categoryBudgets);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert("Export failed", msg);
    } finally {
      setStatus("idle");
    }
  };

  const handleImport = async () => {
    Alert.alert(
      "Import backup",
      "This will replace ALL your current data with the contents of the backup file. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Import",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              setStatus("importing");
              const data = await importBackup();
              restoreBackup(data);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                "Import successful",
                `Restored ${data.expenses.length} transaction${data.expenses.length !== 1 ? "s" : ""} from backup dated ${new Date(data.exportedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}.`,
                [{ text: "OK", onPress: () => router.replace("/(tabs)/") }],
              );
            } catch (e: unknown) {
              const msg = e instanceof Error ? e.message : "Unknown error";
              if (msg !== "CANCELLED") Alert.alert("Import failed", msg);
            } finally {
              setStatus("idle");
            }
          },
        },
      ],
    );
  };

  const handleClearData = () => {
    Alert.alert(
      "Clear all data",
      "This will permanently delete ALL your expenses, profile, and settings. This cannot be undone.\n\nWe recommend exporting a backup first.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete everything",
          style: "destructive",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            clearAllData();
            router.replace("/onboarding");
          },
        },
      ],
    );
  };

  const expenseCount = expenses.filter((e) => !e.isIncome).length;
  const incomeCount = expenses.filter((e) => e.isIncome).length;
  const backupSize = (() => {
    const bytes = new TextEncoder().encode(JSON.stringify({ expenses, userProfile, categoryBudgets })).length;
    return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
  })();

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Feather name="arrow-left" size={22} color={col.foreground} />
          </TouchableOpacity>
          <Text style={[styles.heading, { color: col.foreground }]}>Settings</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Profile section */}
        <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>Profile</Text>
        <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border }]}>
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: col.mutedForeground }]}>Name</Text>
            <TextInput
              style={[styles.fieldInput, { color: col.foreground }]}
              value={editName}
              onChangeText={(v) => { setEditName(v); markDirty(); }}
              placeholder="Your name"
              placeholderTextColor={col.mutedForeground}
              autoCapitalize="words"
            />
          </View>
          <View style={[styles.divider, { backgroundColor: col.border }]} />
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: col.mutedForeground }]}>Monthly income</Text>
            <View style={styles.currencyRow}>
              <Text style={[styles.currencySign, { color: col.mutedForeground }]}>$</Text>
              <TextInput
                style={[styles.fieldInput, { color: col.foreground }]}
                value={editIncome}
                onChangeText={(v) => { setEditIncome(v); markDirty(); }}
                keyboardType="numeric"
                placeholder="4500"
                placeholderTextColor={col.mutedForeground}
              />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: col.border }]} />
          <View style={styles.fieldRow}>
            <Text style={[styles.fieldLabel, { color: col.mutedForeground }]}>Monthly budget</Text>
            <View style={styles.currencyRow}>
              <Text style={[styles.currencySign, { color: col.mutedForeground }]}>$</Text>
              <TextInput
                style={[styles.fieldInput, { color: col.foreground }]}
                value={editBudget}
                onChangeText={(v) => { setEditBudget(v); markDirty(); }}
                keyboardType="numeric"
                placeholder="2500"
                placeholderTextColor={col.mutedForeground}
              />
            </View>
          </View>
          {profileDirty && (
            <TouchableOpacity
              style={[styles.saveProfileBtn, { backgroundColor: col.primary }]}
              onPress={saveProfile}
            >
              <Feather name="check" size={15} color="#fff" />
              <Text style={styles.saveProfileText}>Save changes</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Data overview */}
        <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>Your data</Text>
        <View style={[styles.statsRow]}>
          <View style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border }]}>
            <Text style={[styles.statVal, { color: col.primary }]}>{expenseCount}</Text>
            <Text style={[styles.statLabel, { color: col.mutedForeground }]}>Expenses</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border }]}>
            <Text style={[styles.statVal, { color: "#10B981" }]}>{incomeCount}</Text>
            <Text style={[styles.statLabel, { color: col.mutedForeground }]}>Income</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border }]}>
            <Text style={[styles.statVal, { color: col.foreground }]}>{backupSize}</Text>
            <Text style={[styles.statLabel, { color: col.mutedForeground }]}>Backup size</Text>
          </View>
        </View>

        {/* Backup & Restore */}
        <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>Backup & Restore</Text>
        <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, padding: 0 }]}>

          {/* Export */}
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomColor: col.border, borderBottomWidth: 1 }]}
            onPress={handleExport}
            disabled={status !== "idle"}
            activeOpacity={0.6}
          >
            <View style={[styles.actionIcon, { backgroundColor: col.primary + "18" }]}>
              {status === "exporting"
                ? <ActivityIndicator size="small" color={col.primary} />
                : <Feather name="upload-cloud" size={18} color={col.primary} />}
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionLabel, { color: col.foreground }]}>Export backup</Text>
              <Text style={[styles.actionSub, { color: col.mutedForeground }]}>
                Save a JSON file with all your data
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={col.mutedForeground} />
          </TouchableOpacity>

          {/* Import */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleImport}
            disabled={status !== "idle"}
            activeOpacity={0.6}
          >
            <View style={[styles.actionIcon, { backgroundColor: "#10B981" + "18" }]}>
              {status === "importing"
                ? <ActivityIndicator size="small" color="#10B981" />
                : <Feather name="download-cloud" size={18} color="#10B981" />}
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionLabel, { color: col.foreground }]}>Import backup</Text>
              <Text style={[styles.actionSub, { color: col.mutedForeground }]}>
                Restore data from a JSON backup file
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={col.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* How it works info card */}
        <View style={[styles.infoCard, { backgroundColor: col.secondary, borderColor: col.primary + "30" }]}>
          <Feather name="info" size={15} color={col.primary} style={{ marginTop: 1 }} />
          <Text style={[styles.infoText, { color: col.mutedForeground }]}>
            <Text style={{ fontWeight: "700", color: col.foreground }}>How backup works: </Text>
            Export saves a <Text style={{ fontWeight: "600" }}>.json</Text> file to your device (or lets you share it via email, Drive, etc.). To restore, open the app after reinstalling and tap Import, then pick the same file.
          </Text>
        </View>

        {/* Danger zone */}
        <Text style={[styles.sectionTitle, { color: col.mutedForeground, marginTop: 8 }]}>Danger zone</Text>
        <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, padding: 0 }]}>
          <TouchableOpacity
            style={styles.actionRow}
            onPress={handleClearData}
            activeOpacity={0.6}
          >
            <View style={[styles.actionIcon, { backgroundColor: col.destructive + "15" }]}>
              <Feather name="trash-2" size={18} color={col.destructive} />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionLabel, { color: col.destructive }]}>Clear all data</Text>
              <Text style={[styles.actionSub, { color: col.mutedForeground }]}>
                Permanently delete everything and start over
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={col.mutedForeground} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.version, { color: col.mutedForeground }]}>Intensive v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  heading: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", textTransform: "uppercase",
    letterSpacing: 1, marginBottom: 8, marginTop: 4, marginLeft: 4,
  },
  card: {
    borderRadius: colors.radius, borderWidth: 1, marginBottom: 16, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  fieldRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: "500", width: 120 },
  fieldInput: { flex: 1, fontSize: 15, fontWeight: "600", textAlign: "right" },
  currencyRow: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "flex-end" },
  currencySign: { fontSize: 15, fontWeight: "600", marginRight: 2 },
  divider: { height: 1, marginHorizontal: 14 },
  saveProfileBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    margin: 12, paddingVertical: 11, borderRadius: 12,
  },
  saveProfileText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statBox: {
    flex: 1, alignItems: "center", padding: 14, borderRadius: colors.radius, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1,
  },
  statVal: { fontSize: 22, fontWeight: "800", marginBottom: 2 },
  statLabel: { fontSize: 11, fontWeight: "500" },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, gap: 12 },
  actionIcon: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  actionContent: { flex: 1 },
  actionLabel: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  actionSub: { fontSize: 12 },
  infoCard: {
    flexDirection: "row", gap: 10, padding: 14, borderRadius: colors.radius,
    borderWidth: 1, marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19 },
  version: { textAlign: "center", fontSize: 12, marginTop: 20 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 13, gap: 12, borderBottomWidth: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "500" },
  rowSublabel: { fontSize: 12, marginTop: 1 },
});

import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { PINSetupModal } from "@/components/PINSetupModal";
import { SecurityQuestionModal } from "@/components/SecurityQuestionModal";
import { COUNTRIES, LANGUAGES, getCountryByCode } from "@/constants/translations";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useSecurity } from "@/context/SecurityContext";
import { useColors } from "@/hooks/useColors";
import { exportBackup, importBackup } from "@/utils/dataBackup";
import {
  DEFAULT_NOTIF_PREFS,
  REMINDER_TIMES,
  cancelDailyReminder,
  getNotifPrefs,
  requestNotificationPermission,
  saveNotifPrefs,
  scheduleDailyReminder,
  type NotifPrefs,
} from "@/utils/notifications";

type Status = "idle" | "exporting" | "importing";

function Row({ icon, label, sublabel, onPress, rightIcon = "chevron-right", tint, col }: { icon: keyof typeof Feather.glyphMap; label: string; sublabel?: string; onPress: () => void; rightIcon?: keyof typeof Feather.glyphMap; tint?: string; col: ReturnType<typeof useColors>; }) {
  return <TouchableOpacity style={[styles.row, { borderBottomColor: col.border }]} onPress={onPress} activeOpacity={0.6}><View style={[styles.rowIcon, { backgroundColor: tint ? tint + "18" : col.secondary }]}><Feather name={icon} size={17} color={tint ?? col.primary} /></View><View style={styles.rowContent}><Text style={[styles.rowLabel, { color: tint ?? col.foreground }]}>{label}</Text>{sublabel ? <Text style={[styles.rowSublabel, { color: col.mutedForeground }]}>{sublabel}</Text> : null}</View><Feather name={rightIcon} size={16} color={col.mutedForeground} /></TouchableOpacity>;
}

export default function SettingsScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, setUserProfile, expenses, categoryBudgets, restoreBackup, clearAllData } = useApp();
  const { t, language, setLanguage } = useLanguage();
  const [status, setStatus] = useState<Status>("idle");
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;
  const { isPinEnabled, isBiometricEnabled, isBiometricAvailable, hasSecurityQuestion, disablePin, toggleBiometric } = useSecurity();
  const [editName, setEditName] = useState(userProfile?.name ?? "");
  const [editIncome, setEditIncome] = useState(String(userProfile?.monthlyIncome ?? ""));
  const [editBudget, setEditBudget] = useState(String(userProfile?.monthlyBudget ?? ""));
  const [editCountry, setEditCountry] = useState(userProfile?.countryCode ?? "us");
  const [profileDirty, setProfileDirty] = useState(false);
  const [showPINSetup, setShowPINSetup] = useState(false);
  const [isChangingPIN, setIsChangingPIN] = useState(false);
  const [showSecurityQ, setShowSecurityQ] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(DEFAULT_NOTIF_PREFS);

  React.useEffect(() => { getNotifPrefs().then(setNotifPrefs); }, []);

  const markDirty = () => setProfileDirty(true);
  const selectedCountry = getCountryByCode(editCountry);

  const saveProfile = () => {
    if (!userProfile) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setUserProfile({ ...userProfile, name: editName.trim() || userProfile.name, monthlyIncome: parseFloat(editIncome) || userProfile.monthlyIncome, monthlyBudget: parseFloat(editBudget) || userProfile.monthlyBudget, countryCode: editCountry });
    setProfileDirty(false);
  };

  const handleExport = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStatus("exporting");
      await exportBackup(expenses, userProfile, categoryBudgets, language);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      Alert.alert(t("exportFailedTitle"), msg);
    } finally {
      setStatus("idle");
    }
  };

  const handleImport = async () => {
    Alert.alert(t("importConfirmTitle"), t("importConfirmMsg"), [{ text: t("cancel"), style: "cancel" }, { text: t("importBtnLabel"), style: "destructive", onPress: async () => {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setStatus("importing");
        const data = await importBackup();
        restoreBackup(data);
        if (data.language && data.language !== language) {
          await setLanguage(data.language);
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const dateStr = new Date(data.exportedAt).toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { month: "long", day: "numeric", year: "numeric" });
        const msg = data.expenses.length === 1 ? t("importSuccessMsg", { count: data.expenses.length, date: dateStr }) : t("importSuccessMsgPlural", { count: data.expenses.length, date: dateStr });
        Alert.alert(t("importSuccessTitle"), msg, [{ text: t("ok"), onPress: () => router.replace("/" as any) }]);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        if (msg !== "CANCELLED") Alert.alert(t("importFailedTitle"), msg);
      } finally {
        setStatus("idle");
      }
    } }]);
  };

  const handleClearData = () => {
    Alert.alert(t("clearAllDataConfirmTitle"), t("clearAllDataConfirmMsg"), [{ text: t("cancel"), style: "cancel" }, { text: t("deleteEverything"), style: "destructive", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); clearAllData(); router.replace("/onboarding"); } }]);
  };

  const handlePINToggle = (value: boolean) => {
    if (value) {
      setIsChangingPIN(false);
      setShowPINSetup(true);
    } else {
      Alert.alert(t("pinDisableConfirm"), t("pinDisableMsg"), [
        { text: t("cancel"), style: "cancel" },
        { text: t("disable"), style: "destructive", onPress: () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); disablePin(); } },
      ]);
    }
  };

  const handleChangePIN = () => {
    setIsChangingPIN(true);
    setShowPINSetup(true);
  };

  const handleBiometricToggle = async (value: boolean) => {
    Haptics.selectionAsync();
    await toggleBiometric(value);
  };

  const updateNotifPrefs = async (patch: Partial<NotifPrefs>) => {
    const next = { ...notifPrefs, ...patch };
    setNotifPrefs(next);
    await saveNotifPrefs(next);
  };

  const handleBudgetAlertsToggle = async (value: boolean) => {
    Haptics.selectionAsync();
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) { Alert.alert("", t("notifPermissionDenied")); return; }
    }
    await updateNotifPrefs({ budgetAlerts: value });
  };

  const handleDailyReminderToggle = async (value: boolean) => {
    Haptics.selectionAsync();
    if (value) {
      const granted = await requestNotificationPermission();
      if (!granted) { Alert.alert("", t("notifPermissionDenied")); return; }
      await scheduleDailyReminder(t("dailyReminderTitle"), t("dailyReminderBody"), notifPrefs.reminderHour, notifPrefs.reminderMinute);
    } else {
      await cancelDailyReminder();
    }
    await updateNotifPrefs({ dailyReminder: value });
  };

  const handleReminderTime = async (hour: number, minute: number) => {
    Haptics.selectionAsync();
    await scheduleDailyReminder(t("dailyReminderTitle"), t("dailyReminderBody"), hour, minute);
    await updateNotifPrefs({ reminderHour: hour, reminderMinute: minute });
  };

  const expenseCount = expenses.filter((e) => !e.isIncome).length;
  const incomeCount = expenses.filter((e) => e.isIncome).length;
  const backupSize = (() => { const bytes = new TextEncoder().encode(JSON.stringify({ expenses, userProfile, categoryBudgets })).length; return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`; })();

  return (<View style={[styles.root, { backgroundColor: col.background }]}><ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 40 }]} showsVerticalScrollIndicator={false}><View style={styles.pageHeader}><TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}><Feather name="arrow-left" size={22} color={col.foreground} /></TouchableOpacity><Text style={[styles.heading, { color: col.foreground }]}>{t("settings")}</Text><View style={{ width: 22 }} /></View>

    <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>{t("language")}</Text>
    <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, padding: 0 }]}>{LANGUAGES.map((lang, i) => { const isActive = language === lang.code; const isLast = i === LANGUAGES.length - 1; return (<TouchableOpacity key={lang.code} style={[styles.langRow, !isLast && { borderBottomWidth: 1, borderBottomColor: col.border }, isActive && { backgroundColor: col.secondary }]} onPress={() => setLanguage(lang.code)} activeOpacity={0.6}><View style={styles.langContent}><Text style={[styles.langLabel, { color: col.foreground }]}>{lang.nativeLabel}</Text><Text style={[styles.langSub, { color: col.mutedForeground }]}>{lang.label}</Text></View>{isActive && <Feather name="check-circle" size={18} color={col.primary} />}</TouchableOpacity>); })}</View>

    <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>{t("profile")}</Text>
    <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border }]}>
      <View style={styles.fieldRow}><Text style={[styles.fieldLabel, { color: col.mutedForeground }]}>{t("name")}</Text><TextInput style={[styles.fieldInput, { color: col.foreground }]} value={editName} onChangeText={(v) => { setEditName(v); markDirty(); }} placeholder={t("yourName")} placeholderTextColor={col.mutedForeground} autoCapitalize="words" /></View>
      <View style={[styles.divider, { backgroundColor: col.border }]} />
      <View style={styles.fieldRow}><Text style={[styles.fieldLabel, { color: col.mutedForeground }]}>{t("country")}</Text><TouchableOpacity style={[styles.countryPicker, { borderColor: col.border, backgroundColor: col.background }]} onPress={() => {}} activeOpacity={0.9}><View style={styles.countryPickerLeft}><View style={[styles.countryIcon, { backgroundColor: col.primary + "18" }]}><Text style={[styles.countrySymbol, { color: col.primary }]}>{selectedCountry.symbol}</Text></View><View><Text style={[styles.countryName, { color: col.foreground }]}>{selectedCountry.nativeName}</Text><Text style={[styles.countrySub, { color: col.mutedForeground }]}>{selectedCountry.name}</Text></View></View><Feather name="chevron-down" size={16} color={col.mutedForeground} /></TouchableOpacity><View style={styles.countryGrid}>{COUNTRIES.map((country) => { const active = country.code === editCountry; return (<TouchableOpacity key={country.code} style={[styles.countryChip, { borderColor: active ? col.primary : col.border, backgroundColor: active ? col.secondary : col.card }]} onPress={() => { setEditCountry(country.code); markDirty(); Haptics.selectionAsync(); }}><Text style={[styles.countryChipSymbol, { color: active ? col.primary : col.foreground }]}>{country.symbol}</Text><Text style={[styles.countryChipText, { color: active ? col.primary : col.foreground }]}>{country.name}</Text></TouchableOpacity>); })}</View></View>
      <View style={[styles.divider, { backgroundColor: col.border }]} />
      <View style={styles.fieldRow}><Text style={[styles.fieldLabel, { color: col.mutedForeground }]}>{t("monthlyIncome")}</Text><View style={styles.currencyRow}><Text style={[styles.currencySign, { color: col.mutedForeground }]}>{selectedCountry.symbol}</Text><TextInput style={[styles.fieldInput, { color: col.foreground, textAlign: "right" }]} value={editIncome} onChangeText={(v) => { setEditIncome(v); markDirty(); }} keyboardType="numeric" /></View></View>
      <View style={[styles.divider, { backgroundColor: col.border }]} />
      <View style={styles.fieldRow}><Text style={[styles.fieldLabel, { color: col.mutedForeground }]}>{t("monthlyBudget")}</Text><View style={styles.currencyRow}><Text style={[styles.currencySign, { color: col.mutedForeground }]}>{selectedCountry.symbol}</Text><TextInput style={[styles.fieldInput, { color: col.foreground, textAlign: "right" }]} value={editBudget} onChangeText={(v) => { setEditBudget(v); markDirty(); }} keyboardType="numeric" /></View></View>
      {profileDirty && <TouchableOpacity style={[styles.saveBtn, { backgroundColor: col.primary }]} onPress={saveProfile}><Text style={styles.saveBtnText}>{t("saveChanges")}</Text></TouchableOpacity>}
    </View>

    <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>{t("yourData")}</Text>
    <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border }]}><Row icon="upload" label={t("exportBackup")} sublabel={t("exportBackupSub")} onPress={handleExport} tint={col.primary} col={col} /><Row icon="download" label={t("importBackup")} sublabel={t("importBackupSub")} onPress={handleImport} tint={col.primary} col={col} /></View>

    <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>{t("privacy")}</Text>
    <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, padding: 0 }]}>
      {/* PIN Lock row */}
      <View style={[styles.switchRow, { borderBottomWidth: isPinEnabled ? 1 : 0, borderBottomColor: col.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: col.primary + "18" }]}><Feather name="lock" size={17} color={col.primary} /></View>
        <View style={styles.rowContent}><Text style={[styles.rowLabel, { color: col.foreground }]}>{t("pinLock")}</Text><Text style={[styles.rowSublabel, { color: col.mutedForeground }]}>{t("pinLockSub")}</Text></View>
        <Switch value={isPinEnabled} onValueChange={handlePINToggle} trackColor={{ false: col.border, true: col.primary }} thumbColor="#fff" />
      </View>
      {/* Biometric row — only when PIN is on and hardware is available */}
      {isPinEnabled && isBiometricAvailable && (
        <View style={[styles.switchRow, { borderBottomWidth: isPinEnabled ? 1 : 0, borderBottomColor: col.border }]}>
          <View style={[styles.rowIcon, { backgroundColor: col.primary + "18" }]}><Feather name="aperture" size={17} color={col.primary} /></View>
          <View style={styles.rowContent}><Text style={[styles.rowLabel, { color: col.foreground }]}>{t("biometricAuth")}</Text><Text style={[styles.rowSublabel, { color: col.mutedForeground }]}>{t("biometricAuthSub")}</Text></View>
          <Switch value={isBiometricEnabled} onValueChange={handleBiometricToggle} trackColor={{ false: col.border, true: col.primary }} thumbColor="#fff" />
        </View>
      )}
      {/* Change PIN row — only when PIN is on */}
      {isPinEnabled && (
        <TouchableOpacity style={[styles.row, { borderBottomWidth: 1, borderBottomColor: col.border }]} onPress={handleChangePIN} activeOpacity={0.6}>
          <View style={[styles.rowIcon, { backgroundColor: col.primary + "18" }]}><Feather name="refresh-cw" size={17} color={col.primary} /></View>
          <View style={styles.rowContent}><Text style={[styles.rowLabel, { color: col.foreground }]}>{t("changePIN")}</Text></View>
          <Feather name="chevron-right" size={16} color={col.mutedForeground} />
        </TouchableOpacity>
      )}
      {/* Security Question row — only when PIN is on */}
      {isPinEnabled && (
        <TouchableOpacity style={[styles.row, { borderBottomWidth: 0 }]} onPress={() => setShowSecurityQ(true)} activeOpacity={0.6}>
          <View style={[styles.rowIcon, { backgroundColor: col.primary + "18" }]}><Feather name="help-circle" size={17} color={col.primary} /></View>
          <View style={styles.rowContent}>
            <Text style={[styles.rowLabel, { color: col.foreground }]}>{t("securityQuestion")}</Text>
            <Text style={[styles.rowSublabel, { color: col.mutedForeground }]}>{t("securityQuestionSub")}</Text>
          </View>
          <Feather name={hasSecurityQuestion ? "check-circle" : "chevron-right"} size={16} color={hasSecurityQuestion ? "#10B981" : col.mutedForeground} />
        </TouchableOpacity>
      )}
    </View>

    {/* ── Notifications section ──────────────────────────────────────────── */}
    <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>{t("notifications")}</Text>
    <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, padding: 0 }]}>
      {/* Budget Alerts */}
      <View style={[styles.switchRow, { borderBottomWidth: notifPrefs.dailyReminder ? 1 : 0, borderBottomColor: col.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: "#F59E0B18" }]}><Feather name="bell" size={17} color="#F59E0B" /></View>
        <View style={styles.rowContent}><Text style={[styles.rowLabel, { color: col.foreground }]}>{t("budgetAlerts")}</Text><Text style={[styles.rowSublabel, { color: col.mutedForeground }]}>{t("budgetAlertsSub")}</Text></View>
        <Switch value={notifPrefs.budgetAlerts} onValueChange={handleBudgetAlertsToggle} trackColor={{ false: col.border, true: col.primary }} thumbColor="#fff" />
      </View>
      {/* Daily Reminder */}
      <View style={[styles.switchRow, { borderBottomWidth: notifPrefs.dailyReminder ? 1 : 0, borderBottomColor: col.border }]}>
        <View style={[styles.rowIcon, { backgroundColor: "#10B98118" }]}><Feather name="clock" size={17} color="#10B981" /></View>
        <View style={styles.rowContent}><Text style={[styles.rowLabel, { color: col.foreground }]}>{t("dailyReminder")}</Text><Text style={[styles.rowSublabel, { color: col.mutedForeground }]}>{t("dailyReminderSub")}</Text></View>
        <Switch value={notifPrefs.dailyReminder} onValueChange={handleDailyReminderToggle} trackColor={{ false: col.border, true: col.primary }} thumbColor="#fff" />
      </View>
      {/* Reminder time chips — only when daily reminder is on */}
      {notifPrefs.dailyReminder && (
        <View style={{ padding: 14, paddingTop: 8 }}>
          <Text style={[styles.rowSublabel, { color: col.mutedForeground, marginBottom: 10 }]}>{t("reminderTime")}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {REMINDER_TIMES.map((rt) => {
              const active = rt.hour === notifPrefs.reminderHour && rt.minute === notifPrefs.reminderMinute;
              return (
                <TouchableOpacity
                  key={rt.label}
                  style={[styles.timeChip, { borderColor: active ? col.primary : col.border, backgroundColor: active ? col.secondary : "transparent" }]}
                  onPress={() => handleReminderTime(rt.hour, rt.minute)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.timeChipText, { color: active ? col.primary : col.mutedForeground }]}>{rt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>

    <PINSetupModal
      visible={showPINSetup}
      isChanging={isChangingPIN}
      onClose={() => setShowPINSetup(false)}
      onSuccess={() => {
        setShowPINSetup(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("", t("pinSetSuccess"), [{ text: t("ok") }]);
      }}
    />
    <SecurityQuestionModal
      mode="setup"
      visible={showSecurityQ}
      onClose={() => setShowSecurityQ(false)}
      onSuccess={() => {
        setShowSecurityQ(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert("", t("securityQuestion"), [{ text: t("ok") }]);
      }}
    />

    <Text style={[styles.sectionTitle, { color: col.mutedForeground }]}>{t("dangerZone")}</Text>
    <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border }]}><Row icon="trash-2" label={t("clearAllData")} sublabel={t("clearAllDataSub")} onPress={handleClearData} tint="#EF4444" col={col} /></View>

    <View style={styles.statsRow}><View style={[styles.statCard, { backgroundColor: col.card, borderColor: col.border }]}><Text style={[styles.statVal, { color: col.foreground }]}>{expenseCount}</Text><Text style={[styles.statLabel, { color: col.mutedForeground }]}>{t("expenses")}</Text></View><View style={[styles.statCard, { backgroundColor: col.card, borderColor: col.border }]}><Text style={[styles.statVal, { color: "#10B981" }]}>{incomeCount}</Text><Text style={[styles.statLabel, { color: col.mutedForeground }]}>{t("income")}</Text></View><View style={[styles.statCard, { backgroundColor: col.card, borderColor: col.border }]}><Text style={[styles.statVal, { color: col.foreground }]}>{backupSize}</Text><Text style={[styles.statLabel, { color: col.mutedForeground }]}>{t("backupSize")}</Text></View></View></ScrollView></View>);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: "700" },
  sectionTitle: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, marginTop: 8 },
  card: { borderWidth: 1, borderRadius: colors.radius, marginBottom: 12, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", padding: 14, borderBottomWidth: 1 },
  rowIcon: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", marginRight: 12 },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  rowSublabel: { fontSize: 12, marginTop: 2, lineHeight: 17 },
  langRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  langContent: { flex: 1 },
  langLabel: { fontSize: 14, fontWeight: "700" },
  langSub: { fontSize: 12, marginTop: 2 },
  fieldRow: { padding: 14 },
  fieldLabel: { fontSize: 12, fontWeight: "700", marginBottom: 8, textTransform: "uppercase" },
  fieldInput: { fontSize: 15, fontWeight: "600", flex: 1 },
  currencyRow: { flexDirection: "row", alignItems: "center" },
  currencySign: { fontSize: 15, fontWeight: "600", marginRight: 6 },
  divider: { height: 1 },
  saveBtn: { margin: 14, borderRadius: 14, paddingVertical: 12, alignItems: "center" },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  statsRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  statCard: { flex: 1, borderWidth: 1, borderRadius: colors.radius, padding: 12, alignItems: "center" },
  statVal: { fontSize: 18, fontWeight: "800" },
  statLabel: { fontSize: 11, marginTop: 2 },
  countryPicker: { borderWidth: 1, borderRadius: colors.radius, padding: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  countryPickerLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  countryIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  countrySymbol: { fontSize: 12, fontWeight: "800" },
  countryName: { fontSize: 14, fontWeight: "700" },
  countrySub: { fontSize: 12, marginTop: 1 },
  countryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  countryChip: { width: "48%", borderWidth: 1, borderRadius: 14, padding: 10 },
  countryChipSymbol: { fontSize: 12, fontWeight: "800" },
  countryChipText: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  switchRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  timeChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  timeChipText: { fontSize: 12, fontWeight: "600" },
});

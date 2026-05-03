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
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { generateAndSharePDF } from "@/utils/generatePDF";
import { getCountryByCode } from "@/constants/translations";

export default function ReportScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { t, language } = useLanguage();
  const { summary, userProfile, currentMonthExpenses, expenses } = useApp();
  const [exporting, setExporting] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!summary) return null;

  const monthName = new Date().toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { month: "long", year: "numeric" });
  const prevMonthName = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString(language === "ar" ? "ar-SA" : "en-US", { month: "long" });
  })();

  const pct = summary.percentChange;
  const currency = getCountryByCode(userProfile?.countryCode).symbol;
  const pctLabel = pct >= 0
    ? `${pct.toFixed(0)}% ${t("vs")} ${prevMonthName}`
    : `${Math.abs(pct).toFixed(0)}% ${t("vs")} ${prevMonthName}`;

  const monthlyData = (() => {
    const monthMap: Record<string, number> = {};
    expenses.forEach((e) => { const k = e.date.slice(0, 7); monthMap[k] = (monthMap[k] ?? 0) + e.amount; });
    return Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0])).slice(-6)
      .map(([k, v]) => ({ label: new Date(k + "-01").toLocaleDateString("en-US", { month: "short" }), amount: v }));
  })();

  const handleExport = async () => {
    if (currentMonthExpenses.length === 0) {
      Alert.alert(t("noData"), t("noExpensesToExport"));
      return;
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setExporting(true);
      await generateAndSharePDF({ expenses: currentMonthExpenses, userProfile, periodLabel: monthName, periodType: "month", monthlyData });
    } catch {
      Alert.alert(t("exportFailed"), t("couldNotGeneratePDF"));
    } finally {
      setExporting(false);
    }
  };

  const topCatLabel = summary.topCategory ? getCategoryLabel(summary.topCategory, language) : t("noData");

  const STATS = [
    { label: t("topCategory"),    value: topCatLabel },
    { label: t("dailyAverage"),   value: `${currency}${summary.averageDaily.toFixed(0)}` },
    { label: t("weekends"),       value: `${currency}${summary.weekendTotal.toFixed(0)}` },
    { label: t("tabInsights"),    value: `${summary.smallPurchasesPercent.toFixed(0)}%` },
  ];

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
          <Text style={[styles.heading, { color: col.foreground }]}>{t("report")}</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={[styles.monthName, { color: col.mutedForeground }]}>{monthName}</Text>

        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4 }]}>
          <Text style={styles.summaryLabel}>{t("totalSpent")}</Text>
          <Text style={styles.summaryAmount}>
            ${currency}${summary.totalCurrentMonth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <View style={[styles.summaryBadge, { backgroundColor: pct > 0 ? "rgba(251,191,36,0.2)" : "rgba(16,185,129,0.2)" }]}>
            <Feather name={pct > 0 ? "trending-up" : "trending-down"} size={14} color={pct > 0 ? "#FBBF24" : "#6EE7B7"} />
            <Text style={[styles.summaryBadgeText, { color: pct > 0 ? "#FBBF24" : "#6EE7B7" }]}>{pctLabel}</Text>
          </View>
        </View>

        {/* Key stats */}
        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.statLabel, { color: col.mutedForeground }]}>{s.label}</Text>
              <Text style={[styles.statValue, { color: col.foreground }]}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Budget status */}
        {userProfile && (
          <View style={[styles.budgetBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.boxTitle, { color: col.foreground }]}>{t("monthlyBudget")}</Text>
            <View style={styles.budgetRow}>
              <Text style={[styles.budgetStat, { color: col.foreground }]}>{currency}{summary.totalCurrentMonth.toFixed(0)}</Text>
              <Text style={[styles.budgetOf, { color: col.mutedForeground }]}>{t("of")} {currency}{userProfile.monthlyBudget.toFixed(0)} {t("budget")}</Text>
            </View>
            <View style={[styles.budgetTrack, { backgroundColor: col.muted }]}>
              <View
                style={[styles.budgetFill, {
                  width: `${Math.min((summary.totalCurrentMonth / userProfile.monthlyBudget) * 100, 100)}%`,
                  backgroundColor: summary.totalCurrentMonth > userProfile.monthlyBudget ? col.destructive : col.success,
                }]}
              />
            </View>
            <Text style={[styles.budgetStatus, { color: summary.totalCurrentMonth > userProfile.monthlyBudget ? col.destructive : col.success }]}>
              {summary.totalCurrentMonth > userProfile.monthlyBudget
                ? `${t("exceedsBudget")}`
                : `${t("withinBudget")}`}
            </Text>
          </View>
        )}

        {/* Export button */}
        <TouchableOpacity
          style={[styles.exportBtn, { backgroundColor: col.primary, opacity: exporting ? 0.7 : 1, borderRadius: colors.radius }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="file-text" size={18} color="#fff" />
              <Text style={styles.exportBtnText}>{t("exportReport")}</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  pageHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  heading: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },
  monthName: { fontSize: 14, marginBottom: 16 },
  summaryCard: { padding: 24, marginBottom: 16, alignItems: "flex-start" },
  summaryLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 },
  summaryAmount: { color: "#fff", fontSize: 44, fontWeight: "800", letterSpacing: -1, marginBottom: 12 },
  summaryBadge: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  summaryBadgeText: { fontSize: 13, fontWeight: "600" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  statBox: { width: "47.5%", padding: 16, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "700" },
  budgetBox: { padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  boxTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  budgetRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  budgetStat: { fontSize: 24, fontWeight: "800" },
  budgetOf: { fontSize: 14 },
  budgetTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  budgetFill: { height: "100%", borderRadius: 3 },
  budgetStatus: { fontSize: 13, fontWeight: "600" },
  exportBtn: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10 },
  exportBtnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
});

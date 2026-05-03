import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BarChart } from "@/components/BarChart";
import { getCategoryColor, getCategoryLabel } from "@/components/CategoryIcon";
import { DonutChart } from "@/components/DonutChart";
import { SpendingLineChart } from "@/components/SpendingLineChart";
import colors from "@/constants/colors";
import type { Category } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";
import { generateAndSharePDF } from "@/utils/generatePDF";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 64;

type PeriodType = "day" | "month" | "year";

function pad(n: number) { return String(n).padStart(2, "0"); }

function dayLabel(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });
}

function monthLabel(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function prevDay(d: string): string {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() - 1);
  return dt.toISOString().split("T")[0];
}
function nextDay(d: string): string {
  const dt = new Date(d + "T00:00:00");
  dt.setDate(dt.getDate() + 1);
  return dt.toISOString().split("T")[0];
}

export default function AnalyticsScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { expenses, userProfile } = useApp();
  const { t, language } = useLanguage();
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [exporting, setExporting] = useState(false);

  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today.toISOString().split("T")[0]);
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const filtered = useMemo(() => {
    if (periodType === "day") return expenses.filter((e) => e.date === selectedDate);
    if (periodType === "month") {
      const key = `${selectedYear}-${pad(selectedMonth + 1)}`;
      return expenses.filter((e) => e.date.startsWith(key));
    }
    return expenses.filter((e) => e.date.startsWith(String(selectedYear)));
  }, [expenses, periodType, selectedDate, selectedMonth, selectedYear]);

  const totalSpent = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const categoryTotals = useMemo(() => {
    const map: Partial<Record<Category, number>> = {};
    filtered.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + e.amount; });
    return map;
  }, [filtered]);

  const donutData = useMemo(() => {
    if (totalSpent === 0) return [];
    return (Object.entries(categoryTotals) as [Category, number][])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([cat, amount]) => ({ category: cat, amount, percentage: (amount / totalSpent) * 100 }));
  }, [categoryTotals, totalSpent]);

  const barData = useMemo(() => {
    return (Object.entries(categoryTotals) as [Category, number][])
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, amount]) => ({
        label: getCategoryLabel(cat, language).slice(0, 5),
        value: amount,
        color: getCategoryColor(cat),
      }));
  }, [categoryTotals, language]);

  const lineData = useMemo(() => {
    if (periodType === "month") {
      const dayMap: Record<string, number> = {};
      filtered.forEach((e) => { dayMap[e.date] = (dayMap[e.date] ?? 0) + e.amount; });
      return Object.entries(dayMap).sort((a, b) => a[0].localeCompare(b[0]))
        .map(([d, v]) => ({ label: d.slice(8), value: v }));
    }
    if (periodType === "year") {
      const monthMap: Record<string, number> = {};
      filtered.forEach((e) => { const k = e.date.slice(0, 7); monthMap[k] = (monthMap[k] ?? 0) + e.amount; });
      return Object.entries(monthMap).sort((a, b) => a[0].localeCompare(b[0]))
        .map(([k, v]) => ({ label: new Date(k + "-01").toLocaleDateString("en-US", { month: "short" }), value: v }));
    }
    return [];
  }, [periodType, filtered]);

  const monthlyDataForPDF = useMemo(() => {
    if (periodType === "year") return lineData.map((d) => ({ label: d.label, amount: d.value }));
    if (periodType === "month") return lineData.map((d) => ({ label: d.label, amount: d.value }));
    return [];
  }, [periodType, lineData]);

  const periodLabel = useMemo(() => {
    if (periodType === "day") return dayLabel(selectedDate);
    if (periodType === "month") return monthLabel(selectedYear, selectedMonth);
    return String(selectedYear);
  }, [periodType, selectedDate, selectedMonth, selectedYear]);

  const navigateDay = (dir: -1 | 1) => {
    Haptics.selectionAsync();
    setSelectedDate((d) => (dir === -1 ? prevDay(d) : nextDay(d)));
  };
  const navigateMonth = (dir: -1 | 1) => {
    Haptics.selectionAsync();
    setSelectedMonth((m) => {
      const newM = m + dir;
      if (newM < 0) { setSelectedYear((y) => y - 1); return 11; }
      if (newM > 11) { setSelectedYear((y) => y + 1); return 0; }
      return newM;
    });
  };
  const navigateYear = (dir: -1 | 1) => {
    Haptics.selectionAsync();
    setSelectedYear((y) => y + dir);
  };

  const handleExport = async () => {
    if (filtered.length === 0) {
      Alert.alert(t("noData"), t("noExpensesToExport"));
      return;
    }
    try {
      setExporting(true);
      await generateAndSharePDF({ expenses: filtered, userProfile, periodLabel, periodType, monthlyData: monthlyDataForPDF });
    } catch {
      Alert.alert(t("exportFailed"), t("couldNotGeneratePDF"));
    } finally {
      setExporting(false);
    }
  };

  const totalFormatted = `$${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  const PERIOD_LABELS: Record<PeriodType, string> = {
    day: t("day"),
    month: t("month"),
    year: t("year"),
  };

  const heroLabel =
    periodType === "day" ? t("spentOnThisDay")
    : periodType === "month" ? t("spentThisMonth")
    : t("spentThisYear");

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title + Export */}
        <View style={styles.pageHeader}>
          <Text style={[styles.heading, { color: col.foreground }]}>{t("analytics")}</Text>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: col.primary, opacity: exporting ? 0.7 : 1 }]}
            onPress={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Feather name="download" size={14} color="#fff" />
                <Text style={styles.exportText}>{t("exportPDF")}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Period type selector */}
        <View style={[styles.periodTypeRow, { backgroundColor: col.card, borderColor: col.border }]}>
          {(["day", "month", "year"] as PeriodType[]).map((pt) => (
            <TouchableOpacity
              key={pt}
              style={[
                styles.periodTypeBtn,
                periodType === pt && { backgroundColor: col.primary, shadowColor: col.primary, shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
              ]}
              onPress={() => { setPeriodType(pt); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.periodTypeText, { color: periodType === pt ? "#fff" : col.mutedForeground }]}>
                {PERIOD_LABELS[pt]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Period navigator */}
        <View style={[styles.navigator, { backgroundColor: col.card, borderColor: col.border }]}>
          <TouchableOpacity
            onPress={() => periodType === "day" ? navigateDay(-1) : periodType === "month" ? navigateMonth(-1) : navigateYear(-1)}
            style={styles.navArrow}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Feather name="chevron-left" size={20} color={col.foreground} />
          </TouchableOpacity>
          <Text style={[styles.navLabel, { color: col.foreground }]} numberOfLines={1}>{periodLabel}</Text>
          <TouchableOpacity
            onPress={() => periodType === "day" ? navigateDay(1) : periodType === "month" ? navigateMonth(1) : navigateYear(1)}
            style={styles.navArrow}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
            disabled={
              periodType === "day" ? selectedDate >= today.toISOString().split("T")[0]
              : periodType === "month" ? (selectedYear > today.getFullYear() || (selectedYear === today.getFullYear() && selectedMonth >= today.getMonth()))
              : selectedYear >= today.getFullYear()
            }
          >
            <Feather name="chevron-right" size={20} color={col.foreground} />
          </TouchableOpacity>
        </View>

        {/* Total hero */}
        <View style={[styles.heroCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4 }]}>
          <Text style={styles.heroLabel}>{heroLabel}</Text>
          <Text style={styles.heroAmount}>{totalFormatted}</Text>
          <Text style={styles.heroSub}>
            {filtered.length} {filtered.length !== 1 ? t("transactions") : t("transaction")}
          </Text>
        </View>

        {filtered.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Feather name="inbox" size={32} color={col.mutedForeground} />
            <Text style={[styles.emptyText, { color: col.mutedForeground }]}>{t("noExpensesInPeriod")}</Text>
          </View>
        ) : (
          <>
            {/* Donut chart */}
            <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardTitle, { color: col.foreground }]}>{t("spendingByCategory")}</Text>
              <View style={styles.donutRow}>
                <DonutChart data={donutData} size={170} innerRadius={48} centerLabel={totalFormatted} centerSubLabel={t("total")} />
                <View style={styles.legend}>
                  {donutData.slice(0, 5).map((d) => (
                    <View key={d.category} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: getCategoryColor(d.category) }]} />
                      <Text style={[styles.legendLabel, { color: col.foreground }]} numberOfLines={1}>
                        {getCategoryLabel(d.category, language)}
                      </Text>
                      <Text style={[styles.legendPct, { color: col.mutedForeground }]}>
                        {d.percentage.toFixed(0)}%
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            {/* Line chart */}
            {periodType !== "day" && lineData.length >= 2 && (
              <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
                <Text style={[styles.cardTitle, { color: col.foreground }]}>
                  {periodType === "month" ? t("dailySpending") : t("monthlySpending")}
                </Text>
                <SpendingLineChart data={lineData} width={CHART_W} height={130} />
              </View>
            )}

            {/* Bar chart */}
            {barData.length > 0 && (
              <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
                <Text style={[styles.cardTitle, { color: col.foreground }]}>{t("categoryComparison")}</Text>
                <BarChart data={barData} width={CHART_W} height={140} />
              </View>
            )}

            {/* Full breakdown list */}
            <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.cardTitle, { color: col.foreground }]}>{t("fullBreakdown")}</Text>
              {donutData.map((d, i) => (
                <View
                  key={d.category}
                  style={[styles.breakdownItem, i < donutData.length - 1 && { borderBottomWidth: 1, borderBottomColor: col.border }]}
                >
                  <View style={[styles.breakdownDot, { backgroundColor: getCategoryColor(d.category) }]} />
                  <Text style={[styles.breakdownLabel, { color: col.foreground }]}>{getCategoryLabel(d.category, language)}</Text>
                  <View style={styles.breakdownRight}>
                    <Text style={[styles.breakdownAmount, { color: col.foreground }]}>${d.amount.toFixed(0)}</Text>
                    <Text style={[styles.breakdownPct, { color: col.mutedForeground }]}>{d.percentage.toFixed(1)}%</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  pageHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  heading: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  exportText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  periodTypeRow: { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 10, gap: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  periodTypeBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  periodTypeText: { fontSize: 14, fontWeight: "700" },
  navigator: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: colors.radius, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  navArrow: { padding: 4 },
  navLabel: { fontSize: 15, fontWeight: "700", flex: 1, textAlign: "center" },
  heroCard: { padding: 20, marginBottom: 12 },
  heroLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 4 },
  heroAmount: { color: "#fff", fontSize: 36, fontWeight: "800", letterSpacing: -1, marginBottom: 4 },
  heroSub: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  empty: { alignItems: "center", padding: 40, borderWidth: 1, gap: 10, marginTop: 4 },
  emptyText: { fontSize: 14 },
  card: { padding: 16, marginBottom: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: "700", marginBottom: 12 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 12 },
  legendPct: { fontSize: 12, fontWeight: "600" },
  breakdownItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { flex: 1, fontSize: 14 },
  breakdownRight: { alignItems: "flex-end" },
  breakdownAmount: { fontSize: 14, fontWeight: "600" },
  breakdownPct: { fontSize: 12, marginTop: 1 },
});

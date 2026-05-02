import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
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
import { useColors } from "@/hooks/useColors";

export default function ReportScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { summary, userProfile } = useApp();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  if (!summary) return null;

  const monthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const prevMonthName = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toLocaleDateString("en-US", { month: "long" });
  })();

  const pct = summary.percentChange;
  const pctLabel = pct >= 0
    ? `${pct.toFixed(0)}% more than ${prevMonthName}`
    : `${Math.abs(pct).toFixed(0)}% less than ${prevMonthName}`;
  const pctColor = pct > 5 ? col.warning : pct < -5 ? col.success : col.mutedForeground;

  const bestCategory = (() => {
    const cats = Object.entries(summary.categoryTotals) as [string, number][];
    const sorted = cats.filter(([, v]) => v > 0).sort((a, b) => a[1] - b[1]);
    return sorted[0]?.[0] ?? null;
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
          <Text style={[styles.heading, { color: col.foreground }]}>Monthly Report</Text>
          <View style={{ width: 22 }} />
        </View>

        <Text style={[styles.monthName, { color: col.mutedForeground }]}>{monthName}</Text>

        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4 }]}>
          <Text style={styles.summaryLabel}>Total spent</Text>
          <Text style={styles.summaryAmount}>
            ${summary.totalCurrentMonth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </Text>
          <View style={[styles.summaryBadge, { backgroundColor: pct > 0 ? "rgba(251,191,36,0.2)" : "rgba(16,185,129,0.2)" }]}>
            <Feather name={pct > 0 ? "trending-up" : "trending-down"} size={14} color={pct > 0 ? "#FBBF24" : "#6EE7B7"} />
            <Text style={[styles.summaryBadgeText, { color: pct > 0 ? "#FBBF24" : "#6EE7B7" }]}>{pctLabel}</Text>
          </View>
        </View>

        {/* Key stats */}
        <View style={styles.statsGrid}>
          <View style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.statLabel, { color: col.mutedForeground }]}>Top category</Text>
            <Text style={[styles.statValue, { color: col.foreground }]}>
              {summary.topCategory ? getCategoryLabel(summary.topCategory) : "—"}
            </Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.statLabel, { color: col.mutedForeground }]}>Daily average</Text>
            <Text style={[styles.statValue, { color: col.foreground }]}>${summary.averageDaily.toFixed(0)}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.statLabel, { color: col.mutedForeground }]}>Weekend total</Text>
            <Text style={[styles.statValue, { color: col.foreground }]}>${summary.weekendTotal.toFixed(0)}</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.statLabel, { color: col.mutedForeground }]}>Small purchases</Text>
            <Text style={[styles.statValue, { color: col.foreground }]}>{summary.smallPurchasesPercent.toFixed(0)}%</Text>
          </View>
        </View>

        {/* Budget status */}
        {userProfile && (
          <View style={[styles.budgetBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.boxTitle, { color: col.foreground }]}>Budget status</Text>
            <View style={styles.budgetRow}>
              <Text style={[styles.budgetStat, { color: col.foreground }]}>
                ${summary.totalCurrentMonth.toFixed(0)}
              </Text>
              <Text style={[styles.budgetOf, { color: col.mutedForeground }]}>
                of ${userProfile.monthlyBudget.toFixed(0)} budget
              </Text>
            </View>
            <View style={[styles.budgetTrack, { backgroundColor: col.muted }]}>
              <View
                style={[
                  styles.budgetFill,
                  {
                    width: `${Math.min((summary.totalCurrentMonth / userProfile.monthlyBudget) * 100, 100)}%`,
                    backgroundColor: summary.totalCurrentMonth > userProfile.monthlyBudget ? col.destructive : col.success,
                  },
                ]}
              />
            </View>
            <Text style={[styles.budgetStatus, { color: summary.totalCurrentMonth > userProfile.monthlyBudget ? col.destructive : col.success }]}>
              {summary.totalCurrentMonth > userProfile.monthlyBudget
                ? `Over budget by $${(summary.totalCurrentMonth - userProfile.monthlyBudget).toFixed(0)}`
                : `$${(userProfile.monthlyBudget - summary.totalCurrentMonth).toFixed(0)} under budget`}
            </Text>
          </View>
        )}

        {/* Recommendation */}
        <View style={[styles.recBox, { backgroundColor: col.secondary, borderColor: col.primary + "40", borderRadius: colors.radius }]}>
          <Feather name="zap" size={18} color={col.primary} style={{ marginBottom: 8 }} />
          <Text style={[styles.recTitle, { color: col.foreground }]}>Recommendation</Text>
          <Text style={[styles.recText, { color: col.mutedForeground }]}>
            {summary.percentChange > 10
              ? `Your spending increased significantly this month. Focus on reducing ${summary.topCategory ? getCategoryLabel(summary.topCategory).toLowerCase() : "your top category"} expenses next month.`
              : summary.percentChange < -5
              ? `Great job cutting spending this month! Keep tracking your ${summary.topCategory ? getCategoryLabel(summary.topCategory).toLowerCase() : ""} expenses to maintain the trend.`
              : summary.smallPurchasesPercent > 20
              ? `Small purchases made up ${summary.smallPurchasesPercent.toFixed(0)}% of your spending. Try grouping errands to reduce the number of small transactions.`
              : `You're spending a balanced amount. Continue monitoring your ${summary.topCategory ? getCategoryLabel(summary.topCategory).toLowerCase() : ""} category as it's your biggest expense.`}
          </Text>
        </View>
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
  statBox: { width: "47.5%", padding: 16, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  statLabel: { fontSize: 12, marginBottom: 4 },
  statValue: { fontSize: 20, fontWeight: "700" },
  budgetBox: { padding: 16, marginBottom: 12, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  boxTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  budgetRow: { flexDirection: "row", alignItems: "baseline", gap: 6, marginBottom: 10 },
  budgetStat: { fontSize: 24, fontWeight: "800" },
  budgetOf: { fontSize: 14 },
  budgetTrack: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  budgetFill: { height: "100%", borderRadius: 3 },
  budgetStatus: { fontSize: 13, fontWeight: "600" },
  recBox: { padding: 18, borderWidth: 1, marginBottom: 8 },
  recTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  recText: { fontSize: 14, lineHeight: 20 },
});

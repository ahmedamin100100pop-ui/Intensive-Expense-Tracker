import React, { useMemo, useState } from "react";
import {
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
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");
const CHART_W = SCREEN_W - 64;

type Period = "month" | "3months";

export default function AnalyticsScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { summary, currentMonthExpenses, expenses } = useApp();
  const [period, setPeriod] = useState<Period>("month");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const donutData = useMemo(() => {
    if (!summary) return [];
    const total = summary.totalCurrentMonth;
    if (total === 0) return [];
    const cats = Object.entries(summary.categoryTotals) as [Category, number][];
    return cats
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 7)
      .map(([cat, amount]) => ({
        category: cat,
        amount,
        percentage: (amount / total) * 100,
      }));
  }, [summary]);

  const lineData = useMemo(() => {
    if (period === "month") {
      if (!summary) return [];
      return summary.dailySpending.map((d) => ({
        label: d.date.slice(5),
        value: d.amount,
      }));
    }
    // 3-month view: aggregate by month
    const monthMap: Record<string, number> = {};
    expenses.forEach((e) => {
      const key = e.date.slice(0, 7);
      monthMap[key] = (monthMap[key] ?? 0) + e.amount;
    });
    return Object.entries(monthMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-3)
      .map(([k, v]) => ({ label: k.slice(5), value: v }));
  }, [period, summary, expenses]);

  const barData = useMemo(() => {
    if (!summary) return [];
    const cats = Object.entries(summary.categoryTotals) as [Category, number][];
    return cats
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([cat, amount]) => ({
        label: getCategoryLabel(cat).slice(0, 5),
        value: amount,
        color: getCategoryColor(cat),
      }));
  }, [summary]);

  if (!summary) return null;

  const totalFormatted = `$${summary.totalCurrentMonth.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: col.foreground }]}>Analytics</Text>

        {/* Donut chart */}
        <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: col.foreground }]}>Spending by category</Text>
          <Text style={[styles.cardSub, { color: col.mutedForeground }]}>
            {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </Text>
          <View style={styles.donutRow}>
            <DonutChart
              data={donutData}
              size={180}
              innerRadius={52}
              centerLabel={totalFormatted}
              centerSubLabel="total"
            />
            <View style={styles.legend}>
              {donutData.slice(0, 5).map((d) => (
                <View key={d.category} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: getCategoryColor(d.category) }]} />
                  <Text style={[styles.legendLabel, { color: col.foreground }]} numberOfLines={1}>
                    {getCategoryLabel(d.category)}
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
        <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={[styles.cardTitle, { color: col.foreground }]}>Spending trend</Text>
              <Text style={[styles.cardSub, { color: col.mutedForeground }]}>Daily breakdown</Text>
            </View>
            <View style={[styles.periodToggle, { backgroundColor: col.muted }]}>
              {(["month", "3months"] as Period[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodBtn, period === p && { backgroundColor: col.card, borderRadius: 8 }]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={[styles.periodText, { color: period === p ? col.foreground : col.mutedForeground }]}>
                    {p === "month" ? "1M" : "3M"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <SpendingLineChart data={lineData} width={CHART_W} height={140} />
        </View>

        {/* Bar chart */}
        <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: col.foreground }]}>Category comparison</Text>
          <Text style={[styles.cardSub, { color: col.mutedForeground }]}>Top categories this month</Text>
          <BarChart data={barData} width={CHART_W} height={150} />
        </View>

        {/* Category breakdown list */}
        <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
          <Text style={[styles.cardTitle, { color: col.foreground }]}>Full breakdown</Text>
          {donutData.map((d, i) => (
            <View key={d.category} style={[styles.breakdownItem, i < donutData.length - 1 && { borderBottomWidth: 1, borderBottomColor: col.border }]}>
              <View style={[styles.breakdownDot, { backgroundColor: getCategoryColor(d.category) }]} />
              <Text style={[styles.breakdownLabel, { color: col.foreground }]}>{getCategoryLabel(d.category)}</Text>
              <View style={styles.breakdownRight}>
                <Text style={[styles.breakdownAmount, { color: col.foreground }]}>
                  ${d.amount.toFixed(0)}
                </Text>
                <Text style={[styles.breakdownPct, { color: col.mutedForeground }]}>
                  {d.percentage.toFixed(1)}%
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16, letterSpacing: -0.5 },
  card: { padding: 16, marginBottom: 12, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  cardTitle: { fontSize: 15, fontWeight: "700" },
  cardSub: { fontSize: 12, marginTop: 1, marginBottom: 14 },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 0 },
  donutRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  legend: { flex: 1, gap: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  legendLabel: { flex: 1, fontSize: 12 },
  legendPct: { fontSize: 12, fontWeight: "600" },
  periodToggle: { flexDirection: "row", borderRadius: 10, padding: 3, alignItems: "center" },
  periodBtn: { paddingHorizontal: 10, paddingVertical: 5 },
  periodText: { fontSize: 12, fontWeight: "600" },
  breakdownItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, gap: 10 },
  breakdownDot: { width: 10, height: 10, borderRadius: 5 },
  breakdownLabel: { flex: 1, fontSize: 14 },
  breakdownRight: { alignItems: "flex-end" },
  breakdownAmount: { fontSize: 14, fontWeight: "600" },
  breakdownPct: { fontSize: 12, marginTop: 1 },
});

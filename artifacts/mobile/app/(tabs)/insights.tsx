import React, { useMemo } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InsightCard } from "@/components/InsightCard";
import type { InsightType } from "@/components/InsightCard";
import { SmartBudgetSection } from "@/components/SmartBudgetSection";
import { getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface Insight {
  id: string;
  title: string;
  description: string;
  type: InsightType;
}

export default function InsightsScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { summary, userProfile, categoryBudgets } = useApp();
  const { t, language } = useLanguage();

  const insights = useMemo<Insight[]>(() => {
    if (!summary) return [];
    const list: Insight[] = [];

    // Top category
    if (summary.topCategory) {
      const catLabel = getCategoryLabel(summary.topCategory, language);
      list.push({
        id: "top_cat",
        title: t("insightTopCatTitle", { category: catLabel }),
        description: t("insightTopCatDesc", {
          amount: summary.categoryTotals[summary.topCategory].toFixed(0),
          category: catLabel,
        }),
        type: "info",
      });
    }

    // Month over month
    if (Math.abs(summary.percentChange) > 2) {
      const more = summary.percentChange > 0;
      list.push({
        id: "mom",
        title: more
          ? t("insightSpendingUpTitle", { pct: summary.percentChange.toFixed(0) })
          : t("insightSpendingDownTitle", { pct: Math.abs(summary.percentChange).toFixed(0) }),
        description: more
          ? t("insightSpendingUpDesc", { curr: summary.totalCurrentMonth.toFixed(0), prev: summary.totalPreviousMonth.toFixed(0) })
          : t("insightSpendingDownDesc", { curr: summary.totalCurrentMonth.toFixed(0), prev: summary.totalPreviousMonth.toFixed(0) }),
        type: more ? "warning" : "success",
      });
    }

    // Weekend spender
    if (summary.weekendTotal > 0 && summary.weekdayTotal > 0) {
      const ratio = summary.weekendTotal / (summary.weekdayTotal / 5 * 2);
      if (ratio > 1.4) {
        list.push({
          id: "weekend",
          title: t("insightWeekendTitle"),
          description: t("insightWeekendDesc", {
            weekend: summary.weekendTotal.toFixed(0),
            weekday: summary.weekdayTotal.toFixed(0),
          }),
          type: "tip",
        });
      }
    }

    // Small purchases
    if (summary.smallPurchasesPercent > 15) {
      list.push({
        id: "small",
        title: t("insightSmallTitle"),
        description: t("insightSmallDesc", {
          total: summary.smallPurchasesTotal.toFixed(0),
          pct: summary.smallPurchasesPercent.toFixed(0),
        }),
        type: "tip",
      });
    }

    // Unusual expenses
    if (summary.unusualExpenses.length > 0) {
      const count = summary.unusualExpenses.length;
      const items = summary.unusualExpenses
        .map((e) => `$${e.amount.toFixed(0)} (${getCategoryLabel(e.category, language)})`)
        .slice(0, 3)
        .join(", ");
      list.push({
        id: "unusual",
        title: count === 1 ? t("insightUnusualTitle") : t("insightUnusualTitlePlural", { count }),
        description: t("insightUnusualDesc", {
          desc: count === 1 ? t("insightUnusualDescOne") : t("insightUnusualDescMany"),
          items,
        }),
        type: "warning",
      });
    }

    // Budget alerts
    if (userProfile) {
      const budgetPct = summary.totalCurrentMonth / userProfile.monthlyBudget;
      if (budgetPct > 1) {
        list.push({
          id: "over_budget",
          title: t("insightOverBudgetTitle"),
          description: t("insightOverBudgetDesc", {
            spent: summary.totalCurrentMonth.toFixed(0),
            budget: userProfile.monthlyBudget.toFixed(0),
            over: (summary.totalCurrentMonth - userProfile.monthlyBudget).toFixed(0),
          }),
          type: "warning",
        });
      } else if (budgetPct > 0.8) {
        list.push({
          id: "near_budget",
          title: t("insightNearBudgetTitle"),
          description: t("insightNearBudgetDesc", {
            pct: (budgetPct * 100).toFixed(0),
            left: (userProfile.monthlyBudget - summary.totalCurrentMonth).toFixed(0),
          }),
          type: "warning",
        });
      } else if (budgetPct < 0.5 && new Date().getDate() >= 15) {
        list.push({
          id: "on_track",
          title: t("insightOnTrackTitle"),
          description: t("insightOnTrackDesc", {
            spent: summary.totalCurrentMonth.toFixed(0),
            budget: userProfile.monthlyBudget.toFixed(0),
          }),
          type: "success",
        });
      }
    }

    // Category budget alerts
    categoryBudgets.forEach((cb) => {
      const spent = summary.categoryTotals[cb.category] ?? 0;
      const pct = spent / cb.budgetAmount;
      const catLabel = getCategoryLabel(cb.category, language);
      if (pct > 1) {
        list.push({
          id: `cat_over_${cb.category}`,
          title: t("insightCatOverTitle", { category: catLabel }),
          description: t("insightCatOverDesc", {
            spent: spent.toFixed(0),
            category: catLabel,
            over: (spent - cb.budgetAmount).toFixed(0),
            limit: cb.budgetAmount.toFixed(0),
          }),
          type: "warning",
        });
      } else if (pct > 0.8) {
        list.push({
          id: `cat_warn_${cb.category}`,
          title: t("insightCatWarnTitle", { category: catLabel, pct: (pct * 100).toFixed(0) }),
          description: t("insightCatWarnDesc", {
            spent: spent.toFixed(0),
            limit: cb.budgetAmount.toFixed(0),
            category: catLabel.toLowerCase(),
          }),
          type: "tip",
        });
      }
    });

    // Average daily
    if (summary.averageDaily > 0) {
      const projected = summary.averageDaily * 30;
      const overBudget = projected > (userProfile?.monthlyBudget ?? Infinity);
      list.push({
        id: "daily_avg",
        title: t("insightDailyTitle", { avg: summary.averageDaily.toFixed(0) }),
        description: (overBudget ? t("insightDailyDescOver") : t("insightDailyDescOk"))
          .replace("{projected}", projected.toFixed(0)),
        type: "info",
      });
    }

    return list;
  }, [summary, userProfile, categoryBudgets, t, language]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: col.foreground }]}>{t("insights")}</Text>
        <Text style={[styles.subheading, { color: col.mutedForeground }]}>{t("behaviorAnalysis")}</Text>

        {insights.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.emptyText, { color: col.mutedForeground }]}>{t("noInsightsYet")}</Text>
            <Text style={[styles.emptySub, { color: col.mutedForeground }]}>{t("addExpensesToStart")}</Text>
          </View>
        ) : (
          insights.map((ins, i) => (
            <InsightCard
              key={ins.id}
              title={ins.title}
              description={ins.description}
              type={ins.type}
              index={i}
            />
          ))
        )}

        <SmartBudgetSection />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  heading: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  subheading: { fontSize: 13, marginTop: 4, marginBottom: 16 },
  empty: { alignItems: "center", padding: 40, borderWidth: 1, gap: 8 },
  emptyText: { fontSize: 16, fontWeight: "600" },
  emptySub: { fontSize: 13 },
});

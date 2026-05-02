import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InsightCard } from "@/components/InsightCard";
import type { InsightType } from "@/components/InsightCard";
import { getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import { useApp } from "@/context/AppContext";
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

  const insights = useMemo<Insight[]>(() => {
    if (!summary) return [];
    const list: Insight[] = [];

    // Top category
    if (summary.topCategory) {
      list.push({
        id: "top_cat",
        title: `${getCategoryLabel(summary.topCategory)} is your top category`,
        description: `You've spent $${summary.categoryTotals[summary.topCategory].toFixed(0)} on ${getCategoryLabel(summary.topCategory).toLowerCase()} this month — more than any other category.`,
        type: "info",
      });
    }

    // Month over month
    if (Math.abs(summary.percentChange) > 2) {
      const more = summary.percentChange > 0;
      list.push({
        id: "mom",
        title: more
          ? `Spending up ${summary.percentChange.toFixed(0)}% this month`
          : `Spending down ${Math.abs(summary.percentChange).toFixed(0)}% vs last month`,
        description: more
          ? `You've spent $${summary.totalCurrentMonth.toFixed(0)} so far versus $${summary.totalPreviousMonth.toFixed(0)} last month. Keep an eye on it.`
          : `Great news — you're spending less than last month. You spent $${summary.totalCurrentMonth.toFixed(0)} vs $${summary.totalPreviousMonth.toFixed(0)} last month.`,
        type: more ? "warning" : "success",
      });
    }

    // Weekend spender
    if (summary.weekendTotal > 0 && summary.weekdayTotal > 0) {
      const ratio = summary.weekendTotal / (summary.weekdayTotal / 5 * 2);
      if (ratio > 1.4) {
        list.push({
          id: "weekend",
          title: "You spend more on weekends",
          description: `Your weekend spending is $${summary.weekendTotal.toFixed(0)} vs $${summary.weekdayTotal.toFixed(0)} on weekdays (normalized). Most of your discretionary spending happens on weekends.`,
          type: "tip",
        });
      }
    }

    // Small purchases
    if (summary.smallPurchasesPercent > 15) {
      list.push({
        id: "small",
        title: "Small purchases are adding up",
        description: `Purchases under $10 totalled $${summary.smallPurchasesTotal.toFixed(0)} — ${summary.smallPurchasesPercent.toFixed(0)}% of your spending. These often go unnoticed.`,
        type: "tip",
      });
    }

    // Unusual expenses
    if (summary.unusualExpenses.length > 0) {
      list.push({
        id: "unusual",
        title: `${summary.unusualExpenses.length} unusually large expense${summary.unusualExpenses.length > 1 ? "s" : ""}`,
        description: `You had ${summary.unusualExpenses.length > 1 ? "several expenses" : "an expense"} significantly higher than your average: ${summary.unusualExpenses.map((e) => `$${e.amount.toFixed(0)} (${getCategoryLabel(e.category)})`).slice(0, 3).join(", ")}.`,
        type: "warning",
      });
    }

    // Budget alerts
    if (userProfile) {
      const budgetPct = summary.totalCurrentMonth / userProfile.monthlyBudget;
      if (budgetPct > 1) {
        list.push({
          id: "over_budget",
          title: "You've exceeded your monthly budget",
          description: `Your spending of $${summary.totalCurrentMonth.toFixed(0)} has gone over your $${userProfile.monthlyBudget.toFixed(0)} budget by $${(summary.totalCurrentMonth - userProfile.monthlyBudget).toFixed(0)}.`,
          type: "warning",
        });
      } else if (budgetPct > 0.8) {
        list.push({
          id: "near_budget",
          title: "Approaching your monthly budget",
          description: `You've used ${(budgetPct * 100).toFixed(0)}% of your monthly budget. Only $${(userProfile.monthlyBudget - summary.totalCurrentMonth).toFixed(0)} left.`,
          type: "warning",
        });
      } else if (budgetPct < 0.5 && new Date().getDate() >= 15) {
        list.push({
          id: "on_track",
          title: "You're doing well this month",
          description: `You've spent $${summary.totalCurrentMonth.toFixed(0)} of your $${userProfile.monthlyBudget.toFixed(0)} budget halfway through the month. Keep it up.`,
          type: "success",
        });
      }
    }

    // Category budget alerts
    categoryBudgets.forEach((cb) => {
      const spent = summary.categoryTotals[cb.category] ?? 0;
      const pct = spent / cb.budgetAmount;
      if (pct > 1) {
        list.push({
          id: `cat_over_${cb.category}`,
          title: `${getCategoryLabel(cb.category)} budget exceeded`,
          description: `You've spent $${spent.toFixed(0)} on ${getCategoryLabel(cb.category).toLowerCase()}, which is $${(spent - cb.budgetAmount).toFixed(0)} over your $${cb.budgetAmount.toFixed(0)} limit.`,
          type: "warning",
        });
      } else if (pct > 0.8) {
        list.push({
          id: `cat_warn_${cb.category}`,
          title: `${getCategoryLabel(cb.category)} is at ${(pct * 100).toFixed(0)}% of budget`,
          description: `You've spent $${spent.toFixed(0)} of your $${cb.budgetAmount.toFixed(0)} ${getCategoryLabel(cb.category).toLowerCase()} budget.`,
          type: "tip",
        });
      }
    });

    // Average daily
    if (summary.averageDaily > 0) {
      list.push({
        id: "daily_avg",
        title: `Spending $${summary.averageDaily.toFixed(0)} per day on average`,
        description: `At this pace, you'll spend roughly $${(summary.averageDaily * 30).toFixed(0)} this month. ${summary.averageDaily * 30 > (userProfile?.monthlyBudget ?? Infinity) ? "This exceeds your monthly budget." : "That's within your budget."}`,
        type: "info",
      });
    }

    return list;
  }, [summary, userProfile, categoryBudgets]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: col.foreground }]}>Insights</Text>
        <Text style={[styles.subheading, { color: col.mutedForeground }]}>
          Behavior-based analysis of your spending
        </Text>

        {insights.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Text style={[styles.emptyText, { color: col.mutedForeground }]}>No insights yet</Text>
            <Text style={[styles.emptySub, { color: col.mutedForeground }]}>Add some expenses to get started</Text>
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

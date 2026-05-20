import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import { CategoryIcon, getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import type { LanguageCode } from "@/constants/translations";
import type { Category } from "@/context/AppContext";
import { getCountryByCode } from "@/constants/translations";
import { useColors } from "@/hooks/useColors";

interface Props {
  category: Category;
  budgetAmount: number;
  spentAmount: number;
  language?: LanguageCode;
  countryCode?: string;
}

export function BudgetProgressCard({ category, budgetAmount, spentAmount, language = "en", countryCode }: Props) {
  const col = useColors();
  const pct = budgetAmount > 0 ? Math.min(spentAmount / budgetAmount, 1) : 0;
  const remaining = Math.max(budgetAmount - spentAmount, 0);
  const isOver = spentAmount > budgetAmount;
  const isWarning = pct >= 0.8 && !isOver;
  const currency = getCountryByCode(countryCode).symbol;

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: pct, duration: 600, useNativeDriver: false }).start();
  }, [pct]);

  const barColor = isOver ? col.destructive : isWarning ? col.warning : col.primary;
  const barWidth = anim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const statusText = language === "ar"
    ? isOver
      ? `${currency}${(spentAmount - budgetAmount).toFixed(0)} تجاوز الميزانية`
      : `${currency}${remaining.toFixed(0)} متبقي · ${Math.round(pct * 100)}% مُستخدم`
    : isOver
      ? `${currency}${(spentAmount - budgetAmount).toFixed(0)} over budget`
      : `${currency}${remaining.toFixed(0)} remaining · ${Math.round(pct * 100)}% used`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: col.card,
          borderColor: isOver ? col.destructive + "40" : col.border,
          borderRadius: colors.radius,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.left}>
          <CategoryIcon category={category} size="sm" />
          <Text style={[styles.label, { color: col.foreground }]}>{getCategoryLabel(category, language)}</Text>
        </View>
        <View style={styles.amounts}>
          <Text style={[styles.spent, { color: col.foreground }]}>{currency}{spentAmount.toFixed(0)}</Text>
          <Text style={[styles.budget, { color: col.mutedForeground }]}>{currency}{budgetAmount.toFixed(0)}</Text>
        </View>
      </View>

      <View style={[styles.track, { backgroundColor: col.muted }]}>
        <Animated.View style={[styles.fill, { width: barWidth, backgroundColor: barColor, borderRadius: 3 }]} />
      </View>

      <Text style={[styles.status, { color: isOver ? col.destructive : isWarning ? col.warning : col.mutedForeground }]}>
        {statusText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14, marginBottom: 10, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  left: { flexDirection: "row", alignItems: "center", gap: 8 },
  label: { fontSize: 14, fontWeight: "600" },
  amounts: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  spent: { fontSize: 15, fontWeight: "700" },
  budget: { fontSize: 12 },
  track: { height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 },
  fill: { height: "100%" },
  status: { fontSize: 11 },
});

import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { CategoryIcon, getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import type { Expense } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  expense: Expense;
  onDelete?: (id: string) => void;
  index?: number;
}

function formatDate(dateStr: string, locale: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(locale, { month: "short", day: "numeric" });
}

const INCOME_COLOR = "#10B981";
const INCOME_BG    = "#ECFDF5";

export function ExpenseCard({ expense, onDelete, index = 0 }: Props) {
  const col = useColors();
  const { t, language } = useLanguage();
  const isIncome = !!expense.isIncome;

  const locale = language === "ar" ? "ar-SA" : "en-US";

  const displayLabel = isIncome
    ? (expense.customLabel ?? t("income"))
    : getCategoryLabel(expense.category, language);

  const amountText = isIncome
    ? `+$${expense.amount.toFixed(2)}`
    : `$${expense.amount.toFixed(2)}`;

  const amountColor = isIncome ? INCOME_COLOR : col.foreground;

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: col.card,
            borderColor: isIncome ? "#D1FAE5" : col.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        {/* Icon */}
        {isIncome && expense.customIcon ? (
          <View style={[styles.incomeIcon, { backgroundColor: INCOME_BG }]}>
            <MaterialCommunityIcons
              name={expense.customIcon as keyof typeof MaterialCommunityIcons.glyphMap}
              size={20}
              color={INCOME_COLOR}
            />
          </View>
        ) : (
          <CategoryIcon category={expense.category} size="md" />
        )}

        {/* Info */}
        <View style={styles.info}>
          <View style={styles.labelRow}>
            <Text style={[styles.category, { color: isIncome ? INCOME_COLOR : col.foreground }]}>
              {displayLabel}
            </Text>
            {isIncome && (
              <View style={styles.incomeBadge}>
                <Text style={styles.incomeBadgeText}>{t("income")}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.note, { color: col.mutedForeground }]} numberOfLines={1}>
            {expense.note ? expense.note : formatDate(expense.date, locale)}
          </Text>
        </View>

        {/* Amount + date */}
        <View style={styles.right}>
          <Text style={[styles.amount, { color: amountColor }]}>{amountText}</Text>
          <Text style={[styles.date, { color: col.mutedForeground }]}>
            {formatDate(expense.date, locale)}
          </Text>
        </View>

        {onDelete && (
          <TouchableOpacity
            onPress={() => onDelete(expense.id)}
            style={styles.deleteBtn}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Feather name="trash-2" size={14} color={col.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", padding: 12, marginBottom: 8, borderWidth: 1, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  incomeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  category: { fontSize: 14, fontWeight: "600" },
  incomeBadge: { backgroundColor: "#D1FAE5", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 },
  incomeBadgeText: { fontSize: 9, fontWeight: "700", color: "#065F46" },
  note: { fontSize: 12, marginTop: 1 },
  right: { alignItems: "flex-end" },
  amount: { fontSize: 15, fontWeight: "700" },
  date: { fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 4, marginLeft: 4 },
});

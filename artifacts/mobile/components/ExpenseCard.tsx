import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { CategoryIcon, getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import type { Expense } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

interface Props {
  expense: Expense;
  onDelete?: (id: string) => void;
  index?: number;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ExpenseCard({ expense, onDelete, index = 0 }: Props) {
  const col = useColors();

  return (
    <Animated.View entering={FadeInDown.delay(index * 40).springify()}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: col.card,
            borderColor: col.border,
            borderRadius: colors.radius,
          },
        ]}
      >
        <CategoryIcon category={expense.category} size="md" />
        <View style={styles.info}>
          <Text style={[styles.category, { color: col.foreground }]}>
            {getCategoryLabel(expense.category)}
          </Text>
          {expense.note ? (
            <Text style={[styles.note, { color: col.mutedForeground }]} numberOfLines={1}>
              {expense.note}
            </Text>
          ) : (
            <Text style={[styles.note, { color: col.mutedForeground }]}>
              {formatDate(expense.date)}
            </Text>
          )}
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: col.foreground }]}>
            ${expense.amount.toFixed(2)}
          </Text>
          <Text style={[styles.date, { color: col.mutedForeground }]}>
            {formatDate(expense.date)}
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
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  info: { flex: 1 },
  category: { fontSize: 14, fontWeight: "600" },
  note: { fontSize: 12, marginTop: 1 },
  right: { alignItems: "flex-end" },
  amount: { fontSize: 15, fontWeight: "700" },
  date: { fontSize: 11, marginTop: 1 },
  deleteBtn: { padding: 4, marginLeft: 4 },
});

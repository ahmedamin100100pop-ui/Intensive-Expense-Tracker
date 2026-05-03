import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BudgetProgressCard } from "@/components/BudgetProgressCard";
import { getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import type { Category } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const ALL_CATEGORIES: Category[] = [
  "food", "transport", "shopping", "rent", "bills",
  "health", "entertainment", "education", "travel", "family", "other",
];

export default function BudgetScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { summary, userProfile, categoryBudgets, setCategoryBudget, setUserProfile } = useApp();
  const { t, language } = useLanguage();

  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMonthly, setEditMonthly] = useState(false);
  const [monthlyBudgetInput, setMonthlyBudgetInput] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const totalBudget = userProfile?.monthlyBudget ?? 0;
  const totalSpent = summary?.totalCurrentMonth ?? 0;
  const overallPct = totalBudget > 0 ? totalSpent / totalBudget : 0;

  const openEdit = (cat: Category) => {
    const existing = categoryBudgets.find((b) => b.category === cat);
    setEditAmount(existing ? existing.budgetAmount.toString() : "");
    setEditCategory(cat);
  };

  const saveEdit = () => {
    if (editCategory && editAmount && parseFloat(editAmount) > 0) {
      setCategoryBudget(editCategory, parseFloat(editAmount));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    setEditCategory(null);
    setEditAmount("");
  };

  const saveMonthlyBudget = () => {
    if (!userProfile || !monthlyBudgetInput || parseFloat(monthlyBudgetInput) <= 0) return;
    setUserProfile({ ...userProfile, monthlyBudget: parseFloat(monthlyBudgetInput) });
    setEditMonthly(false);
    setMonthlyBudgetInput("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const budgetsWithSpending = categoryBudgets.map((b) => ({
    ...b,
    spentAmount: summary?.categoryTotals[b.category] ?? 0,
  }));

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 90 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: col.foreground }]}>{t("tabBudget")}</Text>

        {/* Monthly overview */}
        <View style={[styles.overallCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4 }]}>
          <View style={styles.overallHeader}>
            <View>
              <Text style={styles.overallLabel}>{t("monthlyBudget")}</Text>
              <Text style={styles.overallAmount}>${totalBudget.toLocaleString()}</Text>
            </View>
            <TouchableOpacity
              style={styles.editMonthly}
              onPress={() => { setMonthlyBudgetInput(totalBudget.toString()); setEditMonthly(true); }}
            >
              <Feather name="edit-2" size={16} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          </View>
          <View style={styles.overallProgress}>
            <View style={[styles.overallTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
              <View style={[styles.overallFill, { width: `${Math.min(overallPct * 100, 100)}%`, backgroundColor: overallPct > 0.9 ? "#FBBF24" : "rgba(255,255,255,0.9)" }]} />
            </View>
            <Text style={styles.overallSub}>
              ${totalSpent.toFixed(0)} {t("spent")} · ${Math.max(totalBudget - totalSpent, 0).toFixed(0)} {t("left")}
            </Text>
          </View>
        </View>

        {/* Category budgets */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: col.foreground }]}>{t("categoryBudgets")}</Text>
          <Text style={[styles.sectionSub, { color: col.mutedForeground }]}>{t("tapToEdit")}</Text>
        </View>

        {budgetsWithSpending.map((b) => (
          <TouchableOpacity key={b.category} onPress={() => openEdit(b.category)} activeOpacity={0.85}>
            <BudgetProgressCard
              category={b.category}
              budgetAmount={b.budgetAmount}
              spentAmount={b.spentAmount}
              language={language}
            />
          </TouchableOpacity>
        ))}

        {/* Add budget for unconfigured categories */}
        <Text style={[styles.sectionTitle, { color: col.foreground, marginTop: 8, marginBottom: 10 }]}>
          {t("addMoreBudgets")}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.addRow}>
          {ALL_CATEGORIES.filter((c) => !categoryBudgets.some((b) => b.category === c)).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.addChip, { backgroundColor: col.card, borderColor: col.border }]}
              onPress={() => openEdit(c)}
            >
              <Feather name="plus" size={14} color={col.primary} />
              <Text style={[styles.addChipText, { color: col.foreground }]}>{getCategoryLabel(c, language)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </ScrollView>

      {/* Edit category budget modal */}
      <Modal visible={!!editCategory} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius + 4 }]}>
            <Text style={[styles.modalTitle, { color: col.foreground }]}>
              {t("budgetModal", { category: getCategoryLabel(editCategory ?? "other", language) })}
            </Text>
            <View style={[styles.modalInput, { borderColor: col.border, backgroundColor: col.background }]}>
              <Text style={[styles.modalCurrency, { color: col.mutedForeground }]}>$</Text>
              <TextInput
                style={[styles.modalInputText, { color: col.foreground }]}
                placeholder="300"
                placeholderTextColor={col.mutedForeground}
                keyboardType="numeric"
                value={editAmount}
                onChangeText={setEditAmount}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditCategory(null); setEditAmount(""); }} style={[styles.modalCancel, { borderColor: col.border }]}>
                <Text style={[styles.modalCancelText, { color: col.foreground }]}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveEdit} style={[styles.modalSave, { backgroundColor: col.primary }]}>
                <Text style={styles.modalSaveText}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit monthly budget modal */}
      <Modal visible={editMonthly} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius + 4 }]}>
            <Text style={[styles.modalTitle, { color: col.foreground }]}>{t("monthlyBudget")}</Text>
            <View style={[styles.modalInput, { borderColor: col.border, backgroundColor: col.background }]}>
              <Text style={[styles.modalCurrency, { color: col.mutedForeground }]}>$</Text>
              <TextInput
                style={[styles.modalInputText, { color: col.foreground }]}
                placeholder="2500"
                placeholderTextColor={col.mutedForeground}
                keyboardType="numeric"
                value={monthlyBudgetInput}
                onChangeText={setMonthlyBudgetInput}
                autoFocus
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => { setEditMonthly(false); setMonthlyBudgetInput(""); }} style={[styles.modalCancel, { borderColor: col.border }]}>
                <Text style={[styles.modalCancelText, { color: col.foreground }]}>{t("cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveMonthlyBudget} style={[styles.modalSave, { backgroundColor: col.primary }]}>
                <Text style={styles.modalSaveText}>{t("save")}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16, letterSpacing: -0.5 },
  overallCard: { padding: 20, marginBottom: 20 },
  overallHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  overallLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
  overallAmount: { color: "#fff", fontSize: 32, fontWeight: "800", letterSpacing: -1, marginTop: 2 },
  editMonthly: { padding: 8 },
  overallProgress: { gap: 6 },
  overallTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  overallFill: { height: "100%", borderRadius: 3 },
  overallSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  sectionSub: { fontSize: 12 },
  addRow: { gap: 8, paddingBottom: 4 },
  addChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  addChipText: { fontSize: 13, fontWeight: "500" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", padding: 24, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalInput: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20 },
  modalCurrency: { fontSize: 20, fontWeight: "600", marginRight: 6 },
  modalInputText: { flex: 1, fontSize: 24, fontWeight: "600" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalCancel: { flex: 1, height: 48, borderRadius: colors.radius, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: 15, fontWeight: "600" },
  modalSave: { flex: 1, height: 48, borderRadius: colors.radius, alignItems: "center", justifyContent: "center" },
  modalSaveText: { color: "#fff", fontSize: 15, fontWeight: "600" },
});

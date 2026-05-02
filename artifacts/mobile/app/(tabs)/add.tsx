import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCategoryLabel } from "@/components/CategoryIcon";
import colors from "@/constants/colors";
import type { Category, PaymentMethod } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const CATEGORIES: Category[] = [
  "food", "transport", "shopping", "rent", "bills",
  "health", "entertainment", "education", "travel", "family", "other",
];

const CATEGORY_ICONS: Record<Category, string> = {
  food: "food-fork-drink",
  transport: "car-outline",
  shopping: "shopping-outline",
  rent: "home-outline",
  bills: "lightning-bolt",
  health: "heart-pulse",
  entertainment: "movie-open-outline",
  education: "book-open-outline",
  travel: "airplane",
  family: "account-group",
  other: "dots-horizontal",
};

const CATEGORY_COLORS: Record<Category, string> = {
  food: "#F97316", transport: "#3B82F6", shopping: "#EC4899",
  rent: "#6366F1", bills: "#EAB308", health: "#EF4444",
  entertainment: "#8B5CF6", education: "#14B8A6", travel: "#06B6D4",
  family: "#10B981", other: "#6B7280",
};

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "cash",  label: "Cash",   icon: "cash" },
  { id: "card",  label: "Card",   icon: "credit-card-outline" },
  { id: "bank",  label: "Bank",   icon: "bank-outline" },
  { id: "wallet",label: "Wallet", icon: "wallet-outline" },
];

function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function AddExpenseScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { addExpense } = useApp();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("food");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);

  const canSave = amount.length > 0 && parseFloat(amount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    addExpense({
      amount: parseFloat(amount),
      category,
      paymentMethod,
      note,
      date,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setAmount("");
      setNote("");
      setDate(todayStr());
      router.push("/(tabs)/");
    }, 800);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 90 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.heading, { color: col.foreground }]}>Add Expense</Text>

        {/* Amount */}
        <View style={[styles.amountCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4 }]}>
          <Text style={styles.amountLabel}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountSymbol}>$</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              placeholderTextColor="rgba(255,255,255,0.4)"
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={setAmount}
              autoFocus
            />
          </View>
        </View>

        {/* Category */}
        <Text style={[styles.sectionLabel, { color: col.foreground }]}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
          {CATEGORIES.map((c) => {
            const active = category === c;
            const catColor = CATEGORY_COLORS[c];
            return (
              <TouchableOpacity
                key={c}
                style={[
                  styles.catChip,
                  {
                    backgroundColor: active ? catColor : col.card,
                    borderColor: active ? catColor : col.border,
                  },
                ]}
                onPress={() => { setCategory(c); Haptics.selectionAsync(); }}
              >
                <MaterialCommunityIcons
                  name={CATEGORY_ICONS[c] as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={16}
                  color={active ? "#fff" : catColor}
                />
                <Text style={[styles.catLabel, { color: active ? "#fff" : col.foreground }]}>
                  {getCategoryLabel(c)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Payment method */}
        <Text style={[styles.sectionLabel, { color: col.foreground }]}>Payment method</Text>
        <View style={styles.payRow}>
          {PAYMENT_METHODS.map((p) => {
            const active = paymentMethod === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[
                  styles.payChip,
                  { backgroundColor: active ? col.secondary : col.card, borderColor: active ? col.primary : col.border },
                ]}
                onPress={() => { setPaymentMethod(p.id); Haptics.selectionAsync(); }}
              >
                <MaterialCommunityIcons
                  name={p.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                  size={16}
                  color={active ? col.primary : col.mutedForeground}
                />
                <Text style={[styles.payLabel, { color: active ? col.primary : col.foreground }]}>{p.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Date */}
        <Text style={[styles.sectionLabel, { color: col.foreground }]}>Date</Text>
        <TextInput
          style={[styles.textField, { backgroundColor: col.card, borderColor: col.border, color: col.foreground, borderRadius: colors.radius }]}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={col.mutedForeground}
          value={date}
          onChangeText={setDate}
        />

        {/* Note */}
        <Text style={[styles.sectionLabel, { color: col.foreground }]}>Note (optional)</Text>
        <TextInput
          style={[styles.textField, { backgroundColor: col.card, borderColor: col.border, color: col.foreground, borderRadius: colors.radius, height: 80, textAlignVertical: "top" }]}
          placeholder="What was this for?"
          placeholderTextColor={col.mutedForeground}
          value={note}
          onChangeText={setNote}
          multiline
        />

        {/* Save button */}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: saved ? col.success : canSave ? col.primary : col.muted,
              borderRadius: colors.radius,
            },
          ]}
          onPress={handleSave}
          disabled={!canSave || saved}
        >
          {saved ? (
            <Animated.View entering={ZoomIn} style={styles.savedRow}>
              <MaterialCommunityIcons name="check-circle" size={22} color="#fff" />
              <Text style={styles.saveBtnText}>Saved!</Text>
            </Animated.View>
          ) : (
            <Text style={[styles.saveBtnText, { color: canSave ? "#fff" : col.mutedForeground }]}>
              Save expense
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  heading: { fontSize: 24, fontWeight: "700", marginBottom: 16, letterSpacing: -0.5 },
  amountCard: { padding: 24, marginBottom: 20 },
  amountLabel: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 4 },
  amountRow: { flexDirection: "row", alignItems: "baseline" },
  amountSymbol: { color: "#fff", fontSize: 32, fontWeight: "700", marginRight: 4 },
  amountInput: { color: "#fff", fontSize: 48, fontWeight: "800", flex: 1, letterSpacing: -1 },
  sectionLabel: { fontSize: 14, fontWeight: "600", marginBottom: 10, marginTop: 4 },
  catScroll: { marginBottom: 16 },
  catContent: { gap: 8, paddingRight: 16 },
  catChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  catLabel: { fontSize: 13, fontWeight: "500" },
  payRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  payChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  payLabel: { fontSize: 13, fontWeight: "500" },
  textField: { borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, marginBottom: 16 },
  saveBtn: { height: 56, alignItems: "center", justifyContent: "center", marginTop: 4 },
  saveBtnText: { fontSize: 17, fontWeight: "700" },
  savedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});

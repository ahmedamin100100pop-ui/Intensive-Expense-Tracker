import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import type { Category, PaymentMethod } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_W } = Dimensions.get("window");
const GRID_COLS = 4;
const TILE = (SCREEN_W - 32 - (GRID_COLS - 1) * 8) / GRID_COLS;

// ── Expense categories ────────────────────────────────────────────────────────
const EXP_CATS: { id: Category; label: string; icon: string; color: string }[] = [
  { id: "food",          label: "Food",          icon: "food-fork-drink",      color: "#F97316" },
  { id: "transport",     label: "Transport",      icon: "car-outline",          color: "#3B82F6" },
  { id: "shopping",      label: "Shopping",       icon: "shopping-outline",     color: "#EC4899" },
  { id: "rent",          label: "Rent",           icon: "home-outline",         color: "#6366F1" },
  { id: "bills",         label: "Bills",          icon: "lightning-bolt",       color: "#EAB308" },
  { id: "health",        label: "Health",         icon: "heart-pulse",          color: "#EF4444" },
  { id: "entertainment", label: "Fun",            icon: "movie-open-outline",   color: "#8B5CF6" },
  { id: "education",     label: "Education",      icon: "book-open-outline",    color: "#14B8A6" },
  { id: "travel",        label: "Travel",         icon: "airplane",             color: "#06B6D4" },
  { id: "family",        label: "Family",         icon: "account-group",        color: "#10B981" },
  { id: "other",         label: "Other",          icon: "dots-horizontal",      color: "#6B7280" },
];

// ── Income categories ─────────────────────────────────────────────────────────
const INC_CATS: { id: string; label: string; icon: string; color: string }[] = [
  { id: "salary",     label: "Salary",     icon: "briefcase-outline",   color: "#10B981" },
  { id: "freelance",  label: "Freelance",  icon: "laptop",              color: "#3B82F6" },
  { id: "bonus",      label: "Bonus",      icon: "star-outline",        color: "#F59E0B" },
  { id: "gift",       label: "Gift",       icon: "gift-outline",        color: "#EC4899" },
  { id: "investment", label: "Investment", icon: "trending-up",         color: "#6366F1" },
  { id: "business",   label: "Business",   icon: "store-outline",       color: "#14B8A6" },
  { id: "rental",     label: "Rental",     icon: "key-outline",         color: "#8B5CF6" },
  { id: "refund",     label: "Refund",     icon: "refresh",             color: "#06B6D4" },
  { id: "other",      label: "Other",      icon: "dots-horizontal",     color: "#6B7280" },
];

// ── Icon options for "Other" custom type ─────────────────────────────────────
const CUSTOM_ICONS: { icon: string; label: string }[] = [
  { icon: "music",                  label: "Music"     },
  { icon: "gamepad-variant-outline",label: "Gaming"    },
  { icon: "dumbbell",               label: "Gym"       },
  { icon: "dog-outline",            label: "Pet"       },
  { icon: "baby-carriage",          label: "Baby"      },
  { icon: "glass-cocktail",         label: "Drinks"    },
  { icon: "pill",                   label: "Medicine"  },
  { icon: "meditation",             label: "Wellness"  },
  { icon: "bicycle-outline",        label: "Bike"      },
  { icon: "tools",                  label: "Tools"     },
  { icon: "laptop",                 label: "Tech"      },
  { icon: "phone-outline",          label: "Phone"     },
  { icon: "television-outline",     label: "TV"        },
  { icon: "sofa-outline",           label: "Furniture" },
  { icon: "flower-outline",         label: "Garden"    },
  { icon: "umbrella-outline",       label: "Insurance" },
  { icon: "gift-outline",           label: "Gift"      },
  { icon: "fire",                   label: "Energy"    },
  { icon: "coffee-outline",         label: "Coffee"    },
  { icon: "camera-outline",         label: "Camera"    },
  { icon: "headphones",             label: "Audio"     },
  { icon: "palette-outline",        label: "Art"       },
  { icon: "car-wash",               label: "Car care"  },
  { icon: "printer-outline",        label: "Print"     },
];

const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: "cash",   label: "Cash",   icon: "cash" },
  { id: "card",   label: "Card",   icon: "credit-card-outline" },
  { id: "bank",   label: "Bank",   icon: "bank-outline" },
  { id: "wallet", label: "Wallet", icon: "wallet-outline" },
];

function todayStr() { return new Date().toISOString().split("T")[0]; }

export default function AddScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { addExpense } = useApp();

  type TxType = "expense" | "income";
  const [txType, setTxType] = useState<TxType>("expense");
  const [amount, setAmount] = useState("");
  const [expCat, setExpCat] = useState<Category>("food");
  const [incCatId, setIncCatId] = useState("salary");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayStr());
  const [saved, setSaved] = useState(false);

  // Custom "other" fields
  const [customLabel, setCustomLabel] = useState("");
  const [customIcon, setCustomIcon] = useState("dots-horizontal");

  const isOtherExpense = txType === "expense" && expCat === "other";
  const isOtherIncome = txType === "income" && incCatId === "other";
  const showCustom = isOtherExpense || isOtherIncome;

  const canSave = amount.length > 0 && parseFloat(amount) > 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const handleSave = () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (txType === "income") {
      const cat = INC_CATS.find((c) => c.id === incCatId)!;
      addExpense({
        amount: parseFloat(amount),
        category: "other",
        paymentMethod,
        note,
        date,
        isIncome: true,
        customLabel: incCatId === "other" && customLabel ? customLabel : cat.label,
        customIcon: incCatId === "other" ? customIcon : cat.icon,
      });
    } else {
      addExpense({
        amount: parseFloat(amount),
        category: expCat,
        paymentMethod,
        note,
        date,
        isIncome: false,
        customLabel: expCat === "other" && customLabel ? customLabel : undefined,
        customIcon: expCat === "other" ? customIcon : undefined,
      });
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setAmount("");
      setNote("");
      setDate(todayStr());
      setCustomLabel("");
      setCustomIcon("dots-horizontal");
      router.push("/(tabs)/");
    }, 700);
  };

  const isIncome = txType === "income";

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 12, paddingBottom: botPad + 100 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Text style={[styles.heading, { color: col.foreground }]}>Add Transaction</Text>

          {/* Type toggle */}
          <View style={[styles.typeToggle, { backgroundColor: col.card, borderColor: col.border }]}>
            {(["expense", "income"] as TxType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[
                  styles.typeBtn,
                  txType === t && {
                    backgroundColor: t === "income" ? "#10B981" : col.primary,
                    shadowColor: t === "income" ? "#10B981" : col.primary,
                    shadowOpacity: 0.3, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 3,
                  },
                ]}
                onPress={() => { setTxType(t); Haptics.selectionAsync(); }}
              >
                <MaterialCommunityIcons
                  name={t === "income" ? "arrow-down-circle-outline" : "arrow-up-circle-outline"}
                  size={16}
                  color={txType === t ? "#fff" : col.mutedForeground}
                />
                <Text style={[styles.typeBtnText, { color: txType === t ? "#fff" : col.mutedForeground }]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Amount card */}
          <View style={[
            styles.amountCard,
            { backgroundColor: isIncome ? "#10B981" : col.primary, borderRadius: colors.radius + 4 },
          ]}>
            <Text style={styles.amountLabel}>{isIncome ? "Amount received" : "Amount spent"}</Text>
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

          {/* Category grid */}
          <Text style={[styles.sectionLabel, { color: col.foreground }]}>
            {isIncome ? "Income type" : "Category"}
          </Text>
          <View style={styles.grid}>
            {(isIncome ? INC_CATS : EXP_CATS).map((c) => {
              const active = isIncome ? incCatId === c.id : expCat === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.tile,
                    {
                      width: TILE, height: TILE,
                      backgroundColor: active ? c.color : col.card,
                      borderColor: active ? c.color : col.border,
                      borderRadius: colors.radius,
                    },
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    if (isIncome) setIncCatId(c.id);
                    else setExpCat(c.id as Category);
                  }}
                >
                  <MaterialCommunityIcons
                    name={c.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={22}
                    color={active ? "#fff" : c.color}
                  />
                  <Text style={[styles.tileLabel, { color: active ? "#fff" : col.foreground }]} numberOfLines={1}>
                    {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Custom "Other" section */}
          {showCustom && (
            <View style={[styles.customBox, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.customTitle, { color: col.foreground }]}>Custom type name</Text>
              <TextInput
                style={[styles.customInput, { color: col.foreground, borderColor: col.border, borderRadius: 10 }]}
                placeholder="e.g. Pet expenses, Hobbies…"
                placeholderTextColor={col.mutedForeground}
                value={customLabel}
                onChangeText={setCustomLabel}
              />
              <Text style={[styles.customTitle, { color: col.foreground, marginTop: 12 }]}>Choose an icon</Text>
              <View style={styles.iconGrid}>
                {CUSTOM_ICONS.map((ci) => {
                  const active = customIcon === ci.icon;
                  return (
                    <TouchableOpacity
                      key={ci.icon}
                      style={[
                        styles.iconTile,
                        { backgroundColor: active ? col.primary : col.muted, borderRadius: 10,
                          borderWidth: active ? 2 : 0, borderColor: active ? col.primary : "transparent" },
                      ]}
                      onPress={() => { setCustomIcon(ci.icon); Haptics.selectionAsync(); }}
                    >
                      <MaterialCommunityIcons
                        name={ci.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                        size={20}
                        color={active ? "#fff" : col.mutedForeground}
                      />
                      <Text style={[styles.iconTileLabel, { color: active ? "#fff" : col.mutedForeground }]} numberOfLines={1}>
                        {ci.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

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
                    { flex: 1, backgroundColor: active ? col.secondary : col.card, borderColor: active ? col.primary : col.border },
                  ]}
                  onPress={() => { setPaymentMethod(p.id); Haptics.selectionAsync(); }}
                >
                  <MaterialCommunityIcons
                    name={p.icon as keyof typeof MaterialCommunityIcons.glyphMap}
                    size={15}
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
            style={[
              styles.textField,
              { backgroundColor: col.card, borderColor: col.border, color: col.foreground, borderRadius: colors.radius, height: 70, textAlignVertical: "top" },
            ]}
            placeholder="What was this for?"
            placeholderTextColor={col.mutedForeground}
            value={note}
            onChangeText={setNote}
            multiline
          />

          {/* Save */}
          <TouchableOpacity
            style={[
              styles.saveBtn,
              {
                backgroundColor: saved ? col.success : canSave ? (isIncome ? "#10B981" : col.primary) : col.muted,
                borderRadius: colors.radius,
              },
            ]}
            onPress={handleSave}
            disabled={!canSave || saved}
          >
            {saved ? (
              <Animated.View entering={ZoomIn} style={styles.savedRow}>
                <MaterialCommunityIcons name="check-circle" size={20} color="#fff" />
                <Text style={styles.saveBtnText}>Saved!</Text>
              </Animated.View>
            ) : (
              <Text style={[styles.saveBtnText, { color: canSave ? "#fff" : col.mutedForeground }]}>
                {isIncome ? "Save income" : "Save expense"}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  heading: { fontSize: 22, fontWeight: "700", marginBottom: 12, letterSpacing: -0.5 },

  typeToggle: {
    flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, gap: 4, marginBottom: 12,
  },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 10 },
  typeBtnText: { fontSize: 14, fontWeight: "700" },

  amountCard: { padding: 18, marginBottom: 16 },
  amountLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginBottom: 2 },
  amountRow: { flexDirection: "row", alignItems: "baseline" },
  amountSymbol: { color: "#fff", fontSize: 28, fontWeight: "700", marginRight: 4 },
  amountInput: { color: "#fff", fontSize: 40, fontWeight: "800", flex: 1, letterSpacing: -1 },

  sectionLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, marginTop: 2 },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  tile: {
    alignItems: "center", justifyContent: "center", gap: 4, borderWidth: 1.5,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1,
  },
  tileLabel: { fontSize: 10, fontWeight: "600", textAlign: "center" },

  customBox: { padding: 14, borderWidth: 1, marginBottom: 14 },
  customTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  customInput: {
    borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
  },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  iconTile: { width: 54, alignItems: "center", padding: 8, gap: 4 },
  iconTileLabel: { fontSize: 8, textAlign: "center", fontWeight: "500" },

  payRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  payChip: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, borderWidth: 1.5 },
  payLabel: { fontSize: 12, fontWeight: "600" },

  textField: { borderWidth: 1.5, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 12 },

  saveBtn: { height: 52, alignItems: "center", justifyContent: "center", marginTop: 2 },
  saveBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  savedRow: { flexDirection: "row", alignItems: "center", gap: 8 },
});

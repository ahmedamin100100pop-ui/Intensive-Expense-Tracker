import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getCategoryLabel } from "@/components/CategoryIcon";
import { ExpenseCard } from "@/components/ExpenseCard";
import colors from "@/constants/colors";
import { getCountryByCode } from "@/constants/translations";
import type { Category } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

type DateFilter = "all" | "today" | "week" | "month" | "year";
type TxType   = "all" | "expense" | "income";
type SortOrder = "newest" | "oldest" | "largest" | "smallest";

const ALL_CATEGORIES: Category[] = [
  "food", "transport", "shopping", "rent", "bills",
  "health", "entertainment", "education", "travel", "family", "other",
];

function pad(n: number) { return String(n).padStart(2, "0"); }
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function TransactionsScreen() {
  const col     = useColors();
  const insets  = useSafeAreaInsets();
  const { expenses, userProfile, deleteExpense } = useApp();
  const { t, language } = useLanguage();
  const currency = getCountryByCode(userProfile?.countryCode).symbol;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const [search,          setSearch]          = useState("");
  const [dateFilter,      setDateFilter]      = useState<DateFilter>("all");
  const [typeFilter,      setTypeFilter]      = useState<TxType>("all");
  const [selectedCat,     setSelectedCat]     = useState<Category | "all">("all");
  const [sortOrder,       setSortOrder]       = useState<SortOrder>("newest");
  const [showSortMenu,    setShowSortMenu]    = useState(false);

  // Categories that actually appear in the data
  const availableCats = useMemo(() => {
    const used = new Set(expenses.map((e) => e.category));
    return ALL_CATEGORIES.filter((c) => used.has(c));
  }, [expenses]);

  const today = todayStr();

  const filtered = useMemo(() => {
    let result = [...expenses];

    // ── Type ──────────────────────────────────────────────────────────────────
    if (typeFilter === "expense") result = result.filter((e) => !e.isIncome);
    else if (typeFilter === "income") result = result.filter((e) => !!e.isIncome);

    // ── Date range ────────────────────────────────────────────────────────────
    if (dateFilter === "today") {
      result = result.filter((e) => e.date === today);
    } else if (dateFilter === "week") {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      const from = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      result = result.filter((e) => e.date >= from && e.date <= today);
    } else if (dateFilter === "month") {
      const now = new Date();
      const key = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
      result = result.filter((e) => e.date.startsWith(key));
    } else if (dateFilter === "year") {
      result = result.filter((e) => e.date.startsWith(String(new Date().getFullYear())));
    }

    // ── Category ──────────────────────────────────────────────────────────────
    if (selectedCat !== "all") {
      result = result.filter((e) => e.category === selectedCat);
    }

    // ── Search ────────────────────────────────────────────────────────────────
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((e) =>
        (e.note?.toLowerCase().includes(q)) ||
        getCategoryLabel(e.category, language).toLowerCase().includes(q) ||
        (e.customLabel?.toLowerCase().includes(q)) ||
        e.amount.toString().includes(q)
      );
    }

    // ── Sort ──────────────────────────────────────────────────────────────────
    switch (sortOrder) {
      case "newest":
        result.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
        break;
      case "oldest":
        result.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
        break;
      case "largest":
        result.sort((a, b) => b.amount - a.amount);
        break;
      case "smallest":
        result.sort((a, b) => a.amount - b.amount);
        break;
    }

    return result;
  }, [expenses, typeFilter, dateFilter, selectedCat, search, sortOrder, language, today]);

  const totalAmount = useMemo(() => filtered.reduce((s, e) => s + e.amount, 0), [filtered]);

  const hasActiveFilters =
    dateFilter !== "all" || typeFilter !== "all" || selectedCat !== "all" || search.trim() !== "";

  const clearAll = () => {
    setSearch("");
    setDateFilter("all");
    setTypeFilter("all");
    setSelectedCat("all");
    setSortOrder("newest");
    Haptics.selectionAsync();
  };

  const DATE_CHIPS: { key: DateFilter; label: string }[] = [
    { key: "all",   label: t("filterAll") },
    { key: "today", label: t("filterToday") },
    { key: "week",  label: t("filterThisWeek") },
    { key: "month", label: t("filterThisMonth") },
    { key: "year",  label: t("filterThisYear") },
  ];

  const TYPE_OPTIONS: { key: TxType; label: string }[] = [
    { key: "all",     label: t("allTypes") },
    { key: "expense", label: t("expense") },
    { key: "income",  label: t("income") },
  ];

  const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
    { key: "newest",   label: t("sortNewest") },
    { key: "oldest",   label: t("sortOldest") },
    { key: "largest",  label: t("sortLargest") },
    { key: "smallest", label: t("sortSmallest") },
  ];

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: topPad + 12, backgroundColor: col.background, borderBottomColor: col.border }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Feather name="arrow-left" size={22} color={col.foreground} />
        </TouchableOpacity>
        <Text style={[styles.heading, { color: col.foreground }]}>{t("allTransactions")}</Text>
        {/* Sort button */}
        <TouchableOpacity
          onPress={() => { setShowSortMenu((v) => !v); Haptics.selectionAsync(); }}
          style={[styles.sortBtn, { backgroundColor: col.card, borderColor: col.border }]}
        >
          <Feather name="sliders" size={15} color={col.primary} />
          <Text style={[styles.sortBtnText, { color: col.primary }]}>{t(("sort_" + sortOrder) as any)}</Text>
        </TouchableOpacity>
      </View>

      {/* Sort dropdown */}
      {showSortMenu && (
        <View style={[styles.sortMenu, { backgroundColor: col.card, borderColor: col.border, shadowColor: "#000" }]}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortMenuItem, sortOrder === opt.key && { backgroundColor: col.secondary }]}
              onPress={() => { setSortOrder(opt.key); setShowSortMenu(false); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.sortMenuText, { color: sortOrder === opt.key ? col.primary : col.foreground }]}>{opt.label}</Text>
              {sortOrder === opt.key && <Feather name="check" size={14} color={col.primary} />}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => setShowSortMenu(false)}
      >
        {/* ── Search bar ─────────────────────────────────────────────── */}
        <View style={[styles.searchRow, { backgroundColor: col.card, borderColor: col.border }]}>
          <Feather name="search" size={16} color={col.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: col.foreground }]}
            placeholder={t("searchTransactions")}
            placeholderTextColor={col.mutedForeground}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
              <Feather name="x" size={15} color={col.mutedForeground} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Type filter ─────────────────────────────────────────────── */}
        <View style={[styles.segmented, { backgroundColor: col.card, borderColor: col.border }]}>
          {TYPE_OPTIONS.map((opt) => {
            const active = typeFilter === opt.key;
            const activeBg = opt.key === "income" ? "#10B981" : opt.key === "expense" ? col.primary : col.primary;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[styles.segmentBtn, active && { backgroundColor: activeBg }]}
                onPress={() => { setTypeFilter(opt.key); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.segmentText, { color: active ? "#fff" : col.mutedForeground }]}>{opt.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Date chips ──────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
          {DATE_CHIPS.map((chip) => {
            const active = dateFilter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[styles.chip, { borderColor: active ? col.primary : col.border, backgroundColor: active ? col.secondary : col.card }]}
                onPress={() => { setDateFilter(chip.key); Haptics.selectionAsync(); }}
              >
                <Text style={[styles.chipText, { color: active ? col.primary : col.mutedForeground }]}>{chip.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* ── Category chips ──────────────────────────────────────────── */}
        {availableCats.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
            {/* "All" chip */}
            <TouchableOpacity
              style={[styles.chip, { borderColor: selectedCat === "all" ? col.primary : col.border, backgroundColor: selectedCat === "all" ? col.secondary : col.card }]}
              onPress={() => { setSelectedCat("all"); Haptics.selectionAsync(); }}
            >
              <Text style={[styles.chipText, { color: selectedCat === "all" ? col.primary : col.mutedForeground }]}>{t("allCategories")}</Text>
            </TouchableOpacity>
            {availableCats.map((cat) => {
              const active = selectedCat === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, { borderColor: active ? col.primary : col.border, backgroundColor: active ? col.secondary : col.card }]}
                  onPress={() => { setSelectedCat(cat); Haptics.selectionAsync(); }}
                >
                  <Text style={[styles.chipText, { color: active ? col.primary : col.mutedForeground }]}>
                    {getCategoryLabel(cat, language)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── Results summary bar ─────────────────────────────────────── */}
        <View style={styles.summaryRow}>
          <Text style={[styles.summaryText, { color: col.mutedForeground }]}>
            {filtered.length} {filtered.length === 1 ? t("transaction") : t("transactions")}
            {"  ·  "}
            <Text style={{ color: col.foreground, fontWeight: "700" }}>
              {currency}{totalAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </Text>
          </Text>
          {hasActiveFilters && (
            <TouchableOpacity onPress={clearAll} style={[styles.clearBtn, { borderColor: col.border }]}>
              <Feather name="x" size={12} color={col.primary} />
              <Text style={[styles.clearText, { color: col.primary }]}>{t("clearFilters")}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Transaction list ─────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <Feather name="search" size={30} color={col.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: col.foreground }]}>{t("noResults")}</Text>
            <Text style={[styles.emptySub, { color: col.mutedForeground }]}>{t("noResultsSub")}</Text>
          </View>
        ) : (
          filtered.map((e, i) => (
            <ExpenseCard key={e.id} expense={e} onDelete={deleteExpense} index={i} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  header:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  heading:      { fontSize: 20, fontWeight: "700", flex: 1, marginHorizontal: 12 },
  sortBtn:      { flexDirection: "row", alignItems: "center", gap: 5, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  sortBtnText:  { fontSize: 12, fontWeight: "700" },
  sortMenu:     { position: "absolute", top: 110, right: 16, zIndex: 100, borderWidth: 1, borderRadius: colors.radius, overflow: "hidden", shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  sortMenuItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, gap: 24 },
  sortMenuText: { fontSize: 14, fontWeight: "600" },
  scroll:       { paddingHorizontal: 16, paddingTop: 16 },
  searchRow:    { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, borderRadius: colors.radius, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  searchInput:  { flex: 1, fontSize: 15 },
  segmented:    { flexDirection: "row", borderRadius: 14, borderWidth: 1, padding: 4, marginBottom: 12, gap: 4 },
  segmentBtn:   { flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center" },
  segmentText:  { fontSize: 13, fontWeight: "700" },
  chipsRow:     { flexDirection: "row", gap: 8, marginBottom: 10, paddingVertical: 2 },
  chip:         { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  chipText:     { fontSize: 13, fontWeight: "600" },
  summaryRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  summaryText:  { fontSize: 13 },
  clearBtn:     { flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5 },
  clearText:    { fontSize: 12, fontWeight: "700" },
  empty:        { alignItems: "center", padding: 48, borderWidth: 1, gap: 10, marginTop: 8 },
  emptyTitle:   { fontSize: 16, fontWeight: "700" },
  emptySub:     { fontSize: 13, textAlign: "center" },
});

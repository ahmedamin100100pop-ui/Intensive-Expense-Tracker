import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import colors from "@/constants/colors";
import { getCurrencySymbolForCountry } from "@/constants/translations";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { computeSmartBudgetSuggestions } from "@/utils/smartBudgetEngine";
import type { BudgetSuggestion, RiskLevel } from "@/utils/smartBudgetEngine";

// ── Risk badge config ─────────────────────────────────────────────────────────

const RISK_CONFIG: Record<RiskLevel, { label: string; color: string; bg: string; darkBg: string }> = {
  low:    { label: "ثقة عالية",  color: "#059669", bg: "#D1FAE5", darkBg: "#064E3B" },
  medium: { label: "ثقة متوسطة", color: "#D97706", bg: "#FEF3C7", darkBg: "#451A03" },
  high:   { label: "بيانات محدودة", color: "#7C3AED", bg: "#F5F3FF", darkBg: "#2E1065" },
};

const CATEGORY_ICONS: Record<string, keyof typeof MaterialCommunityIcons.glyphMap> = {
  food:          "food-fork-drink",
  transport:     "car-outline",
  shopping:      "shopping-outline",
  rent:          "home-outline",
  bills:         "lightning-bolt-outline",
  health:        "heart-outline",
  entertainment: "television-play",
  education:     "school-outline",
  travel:        "bag-suitcase-outline",
  family:        "account-group-outline",
  other:         "dots-horizontal-circle-outline",
};

const CATEGORY_COLORS: Record<string, string> = {
  food:          "#F97316",
  transport:     "#3B82F6",
  shopping:      "#EC4899",
  rent:          "#6366F1",
  bills:         "#EAB308",
  health:        "#EF4444",
  entertainment: "#8B5CF6",
  education:     "#14B8A6",
  travel:        "#06B6D4",
  family:        "#10B981",
  other:         "#6B7280",
};

// ── Suggestion card ───────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  symbol,
  applied,
  onApply,
  index,
}: {
  suggestion: BudgetSuggestion;
  symbol: string;
  applied: boolean;
  onApply: (s: BudgetSuggestion) => void;
  index: number;
}) {
  const col = useColors();
  const risk = RISK_CONFIG[suggestion.riskLevel];
  const catColor = CATEGORY_COLORS[suggestion.category] ?? col.primary;
  const catIcon = CATEGORY_ICONS[suggestion.category] ?? "circle-outline";
  const saving = Math.abs(suggestion.changeAmount);
  const savingLabel = suggestion.isSaving
    ? `وفّر ${symbol}${saving.toFixed(0)} شهرياً`
    : `زيادة ${symbol}${saving.toFixed(0)} شهرياً`;
  const deltaColor = suggestion.isSaving ? col.success : col.warning;

  // Progress bar: show recommended vs current as a proportion
  const barMax = Math.max(suggestion.currentBudget, suggestion.recommendedBudget);
  const currentPct = suggestion.currentBudget / barMax;
  const recommendedPct = suggestion.recommendedBudget / barMax;

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
      <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>

        {/* Header: category + risk badge */}
        <View style={styles.cardHeader}>
          <View style={[styles.catIconWrap, { backgroundColor: catColor + "18" }]}>
            <MaterialCommunityIcons name={catIcon} size={18} color={catColor} />
          </View>
          <Text style={[styles.catName, { color: col.foreground }]}>{suggestion.arabicCategoryName}</Text>
          <View style={{ flex: 1 }} />
          <View style={[styles.badge, { backgroundColor: risk.bg }]}>
            <Text style={[styles.badgeText, { color: risk.color }]}>{risk.label}</Text>
          </View>
        </View>

        {/* Budget comparison row */}
        <View style={styles.budgetRow}>
          <View style={styles.budgetItem}>
            <Text style={[styles.budgetLabel, { color: col.mutedForeground }]}>الميزانية الحالية</Text>
            <Text style={[styles.budgetAmount, { color: col.foreground }]}>
              {symbol}{suggestion.currentBudget.toFixed(0)}
            </Text>
          </View>

          <View style={styles.budgetArrow}>
            <Feather
              name={suggestion.isSaving ? "arrow-down-right" : "arrow-up-right"}
              size={20}
              color={deltaColor}
            />
          </View>

          <View style={[styles.budgetItem, styles.budgetItemRight]}>
            <Text style={[styles.budgetLabel, { color: col.mutedForeground }]}>الموصى بها</Text>
            <Text style={[styles.budgetAmount, { color: col.primary, fontWeight: "800" }]}>
              {symbol}{suggestion.recommendedBudget.toFixed(0)}
            </Text>
          </View>
        </View>

        {/* Visual bar comparison */}
        <View style={styles.barsWrap}>
          <View style={[styles.barTrack, { backgroundColor: col.muted }]}>
            <View style={[styles.barFill, { width: `${currentPct * 100}%`, backgroundColor: col.mutedForeground + "60" }]} />
          </View>
          <View style={[styles.barTrack, { backgroundColor: col.muted, marginTop: 4 }]}>
            <View style={[styles.barFill, { width: `${recommendedPct * 100}%`, backgroundColor: col.primary }]} />
          </View>
          <View style={styles.barLabels}>
            <Text style={[styles.barLabelText, { color: col.mutedForeground }]}>الحالي</Text>
            <Text style={[styles.barLabelText, { color: col.primary }]}>الموصى</Text>
          </View>
        </View>

        {/* Delta pill */}
        <View style={[styles.deltaPill, { backgroundColor: deltaColor + "15" }]}>
          <Feather
            name={suggestion.isSaving ? "trending-down" : "trending-up"}
            size={13}
            color={deltaColor}
          />
          <Text style={[styles.deltaText, { color: deltaColor }]}>{savingLabel}</Text>
          <Text style={[styles.deltaPct, { color: deltaColor }]}>
            ({Math.abs(suggestion.changePct).toFixed(0)}%)
          </Text>
        </View>

        {/* Arabic reason */}
        <Text style={[styles.reason, { color: col.mutedForeground }]}>
          {suggestion.arabicReason}
        </Text>

        {/* Data info */}
        <Text style={[styles.dataInfo, { color: col.mutedForeground }]}>
          بناءً على {suggestion.monthsAnalyzed} {suggestion.monthsAnalyzed === 1 ? "شهر" : "أشهر"} · متوسط إنفاقك: {symbol}{suggestion.avgMonthlySpent.toFixed(0)}
        </Text>

        {/* Apply button */}
        {applied ? (
          <View style={[styles.appliedBadge, { backgroundColor: col.success + "18" }]}>
            <Feather name="check-circle" size={15} color={col.success} />
            <Text style={[styles.appliedText, { color: col.success }]}>تم التطبيق</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: col.primary + "15", borderColor: col.primary + "40" }]}
            onPress={() => onApply(suggestion)}
            activeOpacity={0.7}
          >
            <Feather name="check" size={14} color={col.primary} />
            <Text style={[styles.applyBtnText, { color: col.primary }]}>تطبيق الاقتراح</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

// ── Main section component ────────────────────────────────────────────────────

export function SmartBudgetSection() {
  const col = useColors();
  const { expenses, categoryBudgets, userProfile, setCategoryBudget } = useApp();
  const [appliedCategories, setAppliedCategories] = useState<Set<string>>(new Set());

  const symbol = getCurrencySymbolForCountry(userProfile?.countryCode);

  const result = useMemo(
    () => computeSmartBudgetSuggestions(expenses, categoryBudgets, userProfile),
    [expenses, categoryBudgets, userProfile],
  );

  const { suggestions, totalMonthlySaving, monthsAnalyzed, wasIncomeCapped } = result;

  const handleApply = (suggestion: BudgetSuggestion) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCategoryBudget(suggestion.category, suggestion.recommendedBudget);
    setAppliedCategories((prev) => new Set([...prev, suggestion.category]));
  };

  const handleApplyAll = () => {
    const pending = suggestions.filter((sg) => !appliedCategories.has(sg.category));
    if (pending.length === 0) return;

    Alert.alert(
      "تطبيق جميع الاقتراحات",
      `سيتم تحديث ${pending.length} ${pending.length === 1 ? "فئة" : "فئات"} بالقيم الموصى بها. هل تريد المتابعة؟`,
      [
        { text: "إلغاء", style: "cancel" },
        {
          text: "تطبيق الكل",
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const newApplied = new Set(appliedCategories);
            for (const sg of pending) {
              setCategoryBudget(sg.category, sg.recommendedBudget);
              newApplied.add(sg.category);
            }
            setAppliedCategories(newApplied);
          },
        },
      ],
    );
  };

  const allApplied = suggestions.length > 0 && suggestions.every((sg) => appliedCategories.has(sg.category));
  const pendingCount = suggestions.filter((sg) => !appliedCategories.has(sg.category)).length;

  // ── Empty / insufficient data state ────────────────────────────────────────

  const isEmpty = suggestions.length === 0;

  return (
    <View style={styles.section}>

      {/* Section header */}
      <Animated.View entering={FadeInDown.delay(0).springify()} style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconWrap, { backgroundColor: col.primary + "15" }]}>
          <MaterialCommunityIcons name="brain" size={18} color={col.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.sectionTitle, { color: col.foreground }]}>اقتراحات الميزانية الذكية</Text>
          <Text style={[styles.sectionSub, { color: col.mutedForeground }]}>
            تحليل محلي · آخر {monthsAnalyzed} {monthsAnalyzed === 1 ? "شهر" : "أشهر"} · بدون إنترنت
          </Text>
        </View>
        <View style={[styles.offlineBadge, { backgroundColor: col.success + "15" }]}>
          <Feather name="wifi-off" size={11} color={col.success} />
          <Text style={[styles.offlineBadgeText, { color: col.success }]}>أوفلاين</Text>
        </View>
      </Animated.View>

      {/* Empty state */}
      {isEmpty ? (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={[styles.emptyCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <MaterialCommunityIcons name="check-decagram" size={32} color={col.success} />
            <Text style={[styles.emptyTitle, { color: col.foreground }]}>ميزانيتك محسّنة بالفعل</Text>
            <Text style={[styles.emptySub, { color: col.mutedForeground }]}>
              لا توجد تعديلات مقترحة حالياً — استمر في تسجيل مصروفاتك لتحسين دقة التحليل
            </Text>
          </View>
        </Animated.View>
      ) : (
        <>
          {/* Summary banner */}
          <Animated.View entering={FadeInDown.delay(60).springify()}>
            <View style={[styles.summaryBanner, { backgroundColor: col.primary, borderRadius: colors.radius }]}>
              <View style={styles.summaryLeft}>
                <Text style={styles.summaryLabel}>إجمالي التوفير المحتمل</Text>
                <Text style={styles.summaryAmount}>{symbol}{totalMonthlySaving.toFixed(0)}</Text>
                <Text style={styles.summaryPer}>شهرياً</Text>
              </View>
              <View style={styles.summaryRight}>
                <View style={styles.summaryStatRow}>
                  <Text style={styles.summaryStatVal}>{suggestions.length}</Text>
                  <Text style={styles.summaryStatLabel}>اقتراح</Text>
                </View>
                <View style={[styles.summaryDivider]} />
                <View style={styles.summaryStatRow}>
                  <Text style={styles.summaryStatVal}>{monthsAnalyzed}</Text>
                  <Text style={styles.summaryStatLabel}>أشهر بيانات</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Income cap notice */}
          {wasIncomeCapped && (
            <Animated.View entering={FadeInDown.delay(80).springify()}>
              <View style={[styles.noticeBanner, { backgroundColor: col.warning + "12", borderColor: col.warning + "30", borderRadius: colors.radius }]}>
                <Feather name="info" size={14} color={col.warning} />
                <Text style={[styles.noticeText, { color: col.warning }]}>
                  تم تعديل الاقتراحات لتناسب دخلك الشهري
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Suggestion cards */}
          {suggestions.map((sg, i) => (
            <SuggestionCard
              key={sg.category}
              suggestion={sg}
              symbol={symbol}
              applied={appliedCategories.has(sg.category)}
              onApply={handleApply}
              index={i + 1}
            />
          ))}

          {/* Apply all button */}
          {!allApplied ? (
            <Animated.View entering={FadeInDown.delay((suggestions.length + 1) * 80).springify()}>
              <TouchableOpacity
                style={[styles.applyAllBtn, { backgroundColor: col.primary }]}
                onPress={handleApplyAll}
                activeOpacity={0.85}
              >
                <Feather name="check-square" size={18} color="#fff" />
                <Text style={styles.applyAllText}>
                  تطبيق جميع الاقتراحات{pendingCount > 0 ? ` (${pendingCount})` : ""}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <Animated.View entering={FadeInDown.springify()}>
              <View style={[styles.allAppliedRow, { backgroundColor: col.success + "12", borderRadius: colors.radius }]}>
                <Feather name="check-circle" size={18} color={col.success} />
                <Text style={[styles.allAppliedText, { color: col.success }]}>تم تطبيق جميع الاقتراحات</Text>
              </View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: { marginTop: 28 },

  sectionHeaderRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  sectionSub: { fontSize: 11, marginTop: 2 },
  offlineBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  offlineBadgeText: { fontSize: 10, fontWeight: "700" },

  emptyCard: { alignItems: "center", padding: 32, borderWidth: 1, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", lineHeight: 20 },

  summaryBanner: { flexDirection: "row", padding: 20, marginBottom: 12, alignItems: "center" },
  summaryLeft: { flex: 1 },
  summaryLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "600" },
  summaryAmount: { color: "#fff", fontSize: 36, fontWeight: "900", letterSpacing: -1, lineHeight: 40 },
  summaryPer: { color: "rgba(255,255,255,0.65)", fontSize: 12 },
  summaryRight: { flexDirection: "row", alignItems: "center", gap: 16 },
  summaryStatRow: { alignItems: "center" },
  summaryStatVal: { color: "#fff", fontSize: 20, fontWeight: "800" },
  summaryStatLabel: { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 },
  summaryDivider: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.2)" },

  noticeBanner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderWidth: 1, marginBottom: 10 },
  noticeText: { fontSize: 13, fontWeight: "500", flex: 1 },

  // Card
  card: {
    padding: 16, marginBottom: 12, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  catIconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  catName: { fontSize: 15, fontWeight: "700" },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: "700" },

  budgetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  budgetItem: { flex: 1 },
  budgetItemRight: { alignItems: "flex-end" },
  budgetArrow: { paddingHorizontal: 8 },
  budgetLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  budgetAmount: { fontSize: 20, fontWeight: "700", letterSpacing: -0.5 },

  barsWrap: { marginBottom: 12 },
  barTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  barLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: 5 },
  barLabelText: { fontSize: 10, fontWeight: "600" },

  deltaPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, alignSelf: "flex-start", marginBottom: 10 },
  deltaText: { fontSize: 13, fontWeight: "700" },
  deltaPct: { fontSize: 12, fontWeight: "500", opacity: 0.8 },

  reason: { fontSize: 13, lineHeight: 20, marginBottom: 6 },
  dataInfo: { fontSize: 11, marginBottom: 12, opacity: 0.7 },

  applyBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  applyBtnText: { fontSize: 13, fontWeight: "700" },

  appliedBadge: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12 },
  appliedText: { fontSize: 13, fontWeight: "700" },

  applyAllBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 16, borderRadius: colors.radius, marginTop: 4 },
  applyAllText: { color: "#fff", fontSize: 15, fontWeight: "700" },

  allAppliedRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, marginTop: 4 },
  allAppliedText: { fontSize: 14, fontWeight: "700" },
});

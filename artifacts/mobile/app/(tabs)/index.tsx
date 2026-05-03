import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CategoryIcon, getCategoryLabel } from "@/components/CategoryIcon";
import { DashboardCard } from "@/components/DashboardCard";
import { ExpenseCard } from "@/components/ExpenseCard";
import colors from "@/constants/colors";
import type { TranslationKeys } from "@/constants/translations";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getCurrentMonthPrefix(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const PERSONALITY_KEY: Record<string, keyof TranslationKeys> = {
  "Balanced Spender":            "personalityBalanced",
  "Weekend Spender":             "personalityWeekend",
  "Food Lover":                  "personalityFood",
  "Impulse Shopper":             "personalityImpulse",
  "Small Purchases Collector":   "personalitySmall",
  "Careful Planner":             "personalityCareful",
};

export default function HomeScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { summary, userProfile, expenses, deleteExpense, isLoading } = useApp();
  const { t, language } = useLanguage();
  const [refreshing, setRefreshing] = React.useState(false);

  useEffect(() => {
    if (!isLoading && !userProfile?.onboardingComplete) {
      router.replace("/onboarding");
    }
  }, [isLoading, userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const recentTransactions = useMemo(() => {
    const prefix = getCurrentMonthPrefix();
    const all = expenses.filter((e) => e.date.startsWith(prefix));
    return [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  }, [expenses]);

  if (isLoading || !summary) return null;

  const locale = language === "ar" ? "ar-SA" : "en-US";
  const pctChange = summary.percentChange;
  const pctLabel = pctChange >= 0
    ? t("pctVsLastMonth_more", { pct: pctChange.toFixed(0) })
    : t("pctVsLastMonth_less", { pct: Math.abs(pctChange).toFixed(0) });

  const budgetPct = userProfile
    ? Math.round((summary.totalCurrentMonth / userProfile.monthlyBudget) * 100)
    : 0;

  const hasIncome = summary.totalCurrentMonthIncome > 0;

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  const personalityLabel = summary.moneyPersonality
    ? t(PERSONALITY_KEY[summary.moneyPersonality] ?? "personalityBalanced")
    : "";

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 16, paddingBottom: botPad + 90 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={col.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.greeting, { color: col.mutedForeground }]}>
              {userProfile?.name
                ? `${t("goodMorning")}, ${userProfile.name.split(" ")[0]}`
                : t("goodMorning")}
            </Text>
            <Text style={[styles.monthLabel, { color: col.foreground }]}>
              {new Date().toLocaleDateString(locale, { month: "long", year: "numeric" })}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => router.push("/report")} style={[styles.headerBtn, { backgroundColor: col.secondary }]}>
              <Feather name="bar-chart-2" size={16} color={col.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/settings")} style={[styles.headerBtn, { backgroundColor: col.secondary }]}>
              <Feather name="settings" size={16} color={col.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Income + Expenses balance row (if income exists) */}
        {hasIncome ? (
          <View style={styles.balanceRow}>
            <View style={[styles.balanceCard, { backgroundColor: "#10B981", borderRadius: colors.radius + 4, flex: 1 }]}>
              <Text style={styles.balanceCardLabel}>{t("incomeLabel")}</Text>
              <Text style={styles.balanceCardAmount}>{formatCurrency(summary.totalCurrentMonthIncome)}</Text>
            </View>
            <View style={[styles.balanceCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4, flex: 1 }]}>
              <Text style={styles.balanceCardLabel}>{t("spentLabel")}</Text>
              <Text style={styles.balanceCardAmount}>{formatCurrency(summary.totalCurrentMonth)}</Text>
            </View>
          </View>
        ) : (
          /* Hero spending card (no income) */
          <View style={[styles.heroCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4 }]}>
            <Text style={styles.heroLabel}>{t("totalSpentThisMonth")}</Text>
            <Text style={styles.heroAmount}>{formatCurrency(summary.totalCurrentMonth)}</Text>
            <View style={styles.heroRow}>
              <View style={styles.heroPill}>
                <Text style={styles.heroPillText}>{pctLabel}</Text>
              </View>
            </View>
            {userProfile && (
              <View style={styles.budgetRow}>
                <View style={[styles.budgetTrack, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <View style={[styles.budgetFill, { width: `${Math.min(budgetPct, 100)}%`, backgroundColor: budgetPct > 90 ? "#FBBF24" : "rgba(255,255,255,0.9)" }]} />
                </View>
                <Text style={styles.budgetLabel}>
                  {formatCurrency(summary.remainingBudget)} {t("budgetRemaining")} {t("of")} {formatCurrency(userProfile.monthlyBudget)} {t("budget")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* When income exists: show budget progress separately */}
        {hasIncome && userProfile && (
          <View style={[styles.budgetCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
            <View style={styles.budgetCardHeader}>
              <Text style={[styles.budgetCardTitle, { color: col.foreground }]}>{t("budget")}</Text>
              <Text style={[styles.budgetCardPct, { color: budgetPct > 90 ? col.warning : col.success }]}>
                {budgetPct}{t("usedPct")}
              </Text>
            </View>
            <View style={[styles.budgetTrack, { backgroundColor: col.muted }]}>
              <View style={[styles.budgetFill, { width: `${Math.min(budgetPct, 100)}%`, backgroundColor: budgetPct > 90 ? col.warning : col.primary }]} />
            </View>
            <Text style={[styles.budgetCardSub, { color: col.mutedForeground }]}>
              {formatCurrency(summary.remainingBudget)} {t("budgetRemaining")} {t("of")} {formatCurrency(userProfile.monthlyBudget)}
            </Text>
          </View>
        )}

        {/* Stats row */}
        <View style={styles.statsRow}>
          <DashboardCard
            title={t("topCategory")}
            value={summary.topCategory ? getCategoryLabel(summary.topCategory, language) : t("noData")}
            style={styles.statCard}
            compact
          >
            {summary.topCategory && (
              <View style={{ marginTop: 8 }}>
                <CategoryIcon category={summary.topCategory} size="sm" />
              </View>
            )}
          </DashboardCard>

          <DashboardCard
            title={t("dailyAverage")}
            value={`$${summary.averageDaily.toFixed(0)}`}
            subtitle={`${new Date().getDate()} ${t("daysIn")}`}
            style={styles.statCard}
            compact
          />
        </View>

        {/* Money personality */}
        <View style={[styles.personalityCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
          <View style={[styles.personalityIcon, { backgroundColor: col.secondary }]}>
            <Feather name="user" size={18} color={col.primary} />
          </View>
          <View style={styles.personalityContent}>
            <Text style={[styles.personalityLabel, { color: col.mutedForeground }]}>{t("moneyPersonality")}</Text>
            <Text style={[styles.personalityValue, { color: col.foreground }]}>{personalityLabel}</Text>
          </View>
        </View>

        {/* Weekend vs weekday */}
        {(summary.weekendTotal > 0 || summary.weekdayTotal > 0) && (
          <View style={styles.compareRow}>
            <View style={[styles.compareCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.compareLabel, { color: col.mutedForeground }]}>{t("weekdays")}</Text>
              <Text style={[styles.compareValue, { color: col.foreground }]}>{formatCurrency(summary.weekdayTotal)}</Text>
            </View>
            <View style={[styles.compareCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.compareLabel, { color: col.mutedForeground }]}>{t("weekends")}</Text>
              <Text style={[styles.compareValue, { color: col.foreground }]}>{formatCurrency(summary.weekendTotal)}</Text>
            </View>
          </View>
        )}

        {/* Recent transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: col.foreground }]}>{t("recentTransactions")}</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/analytics")}>
              <Text style={[styles.seeAll, { color: col.primary }]}>{t("seeAll")}</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Feather name="inbox" size={32} color={col.mutedForeground} />
              <Text style={[styles.emptyText, { color: col.mutedForeground }]}>{t("noTransactionsThisMonth")}</Text>
              <Text style={[styles.emptySubtext, { color: col.mutedForeground }]}>{t("tapToAddFirst")}</Text>
            </View>
          ) : (
            recentTransactions.map((e, i) => (
              <ExpenseCard key={e.id} expense={e} onDelete={deleteExpense} index={i} />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  greeting: { fontSize: 13, fontWeight: "500" },
  monthLabel: { fontSize: 20, fontWeight: "700", marginTop: 2, letterSpacing: -0.5 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  balanceRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  balanceCard: { padding: 18 },
  balanceCardLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: "500", marginBottom: 4 },
  balanceCardAmount: { color: "#fff", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  heroCard: { padding: 20, marginBottom: 14 },
  heroLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "500", marginBottom: 4 },
  heroAmount: { color: "#fff", fontSize: 40, fontWeight: "800", letterSpacing: -1, marginBottom: 10 },
  heroRow: { flexDirection: "row", marginBottom: 14 },
  heroPill: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  heroPillText: { color: "#fff", fontSize: 12, fontWeight: "500" },
  budgetRow: { gap: 6 },
  budgetTrack: { height: 5, borderRadius: 3, overflow: "hidden" },
  budgetFill: { height: "100%", borderRadius: 3 },
  budgetLabel: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  budgetCard: { padding: 14, marginBottom: 14, borderWidth: 1, gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  budgetCardHeader: { flexDirection: "row", justifyContent: "space-between" },
  budgetCardTitle: { fontSize: 13, fontWeight: "600" },
  budgetCardPct: { fontSize: 13, fontWeight: "700" },
  budgetCardSub: { fontSize: 12 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: { flex: 1 },
  personalityCard: { flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 10, borderWidth: 1, gap: 12, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  personalityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  personalityContent: { flex: 1 },
  personalityLabel: { fontSize: 12 },
  personalityValue: { fontSize: 15, fontWeight: "700", marginTop: 1 },
  compareRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  compareCard: { flex: 1, padding: 14, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  compareLabel: { fontSize: 12, marginBottom: 4 },
  compareValue: { fontSize: 18, fontWeight: "700" },
  section: { marginTop: 6 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  seeAll: { fontSize: 13, fontWeight: "600" },
  emptyState: { alignItems: "center", padding: 32, borderWidth: 1, gap: 8 },
  emptyText: { fontSize: 15, fontWeight: "600" },
  emptySubtext: { fontSize: 13 },
});

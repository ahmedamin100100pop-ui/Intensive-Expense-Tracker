import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect } from "react";
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
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function HomeScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { summary, userProfile, currentMonthExpenses, deleteExpense, isLoading } = useApp();
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

  if (isLoading || !summary) return null;

  const pctChange = summary.percentChange;
  const pctLabel = pctChange >= 0
    ? `+${pctChange.toFixed(0)}% vs last month`
    : `${pctChange.toFixed(0)}% vs last month`;
  const pctColor = pctChange > 0 ? col.warning : col.success;

  const budgetPct = userProfile
    ? Math.round((summary.totalCurrentMonth / userProfile.monthlyBudget) * 100)
    : 0;

  const recent = currentMonthExpenses.slice(0, 5);
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

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
            <Text style={[styles.greeting, { color: col.mutedForeground }]}>Good morning</Text>
            <Text style={[styles.monthLabel, { color: col.foreground }]}>
              {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push("/report")}
            style={[styles.reportBtn, { backgroundColor: col.secondary }]}
          >
            <Feather name="bar-chart-2" size={16} color={col.primary} />
            <Text style={[styles.reportText, { color: col.primary }]}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Hero spending card */}
        <View style={[styles.heroCard, { backgroundColor: col.primary, borderRadius: colors.radius + 4 }]}>
          <Text style={styles.heroLabel}>Total spent this month</Text>
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
                {formatCurrency(summary.remainingBudget)} remaining of {formatCurrency(userProfile.monthlyBudget)} budget
              </Text>
            </View>
          )}
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <DashboardCard
            title="Top category"
            value={summary.topCategory ? getCategoryLabel(summary.topCategory) : "—"}
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
            title="Daily average"
            value={`$${summary.averageDaily.toFixed(0)}`}
            subtitle={`${new Date().getDate()} days in`}
            style={styles.statCard}
            compact
          />
        </View>

        {/* Money personality */}
        <View
          style={[
            styles.personalityCard,
            { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius },
          ]}
        >
          <View style={[styles.personalityIcon, { backgroundColor: col.secondary }]}>
            <Feather name="user" size={18} color={col.primary} />
          </View>
          <View style={styles.personalityContent}>
            <Text style={[styles.personalityLabel, { color: col.mutedForeground }]}>Your money personality</Text>
            <Text style={[styles.personalityValue, { color: col.foreground }]}>{summary.moneyPersonality}</Text>
          </View>
        </View>

        {/* Weekend vs weekday */}
        {(summary.weekendTotal > 0 || summary.weekdayTotal > 0) && (
          <View style={styles.compareRow}>
            <View style={[styles.compareCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.compareLabel, { color: col.mutedForeground }]}>Weekdays</Text>
              <Text style={[styles.compareValue, { color: col.foreground }]}>{formatCurrency(summary.weekdayTotal)}</Text>
            </View>
            <View style={[styles.compareCard, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Text style={[styles.compareLabel, { color: col.mutedForeground }]}>Weekends</Text>
              <Text style={[styles.compareValue, { color: col.foreground }]}>{formatCurrency(summary.weekendTotal)}</Text>
            </View>
          </View>
        )}

        {/* Recent expenses */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: col.foreground }]}>Recent expenses</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/analytics")}>
              <Text style={[styles.seeAll, { color: col.primary }]}>See all</Text>
            </TouchableOpacity>
          </View>
          {recent.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }]}>
              <Feather name="inbox" size={32} color={col.mutedForeground} />
              <Text style={[styles.emptyText, { color: col.mutedForeground }]}>No expenses this month</Text>
              <Text style={[styles.emptySubtext, { color: col.mutedForeground }]}>Tap + to add your first one</Text>
            </View>
          ) : (
            recent.map((e, i) => (
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
  reportBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20 },
  reportText: { fontSize: 13, fontWeight: "600" },
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
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  statCard: { flex: 1 },
  personalityCard: { flexDirection: "row", alignItems: "center", padding: 14, marginBottom: 10, borderWidth: 1, gap: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  personalityIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  personalityContent: { flex: 1 },
  personalityLabel: { fontSize: 12 },
  personalityValue: { fontSize: 15, fontWeight: "700", marginTop: 1 },
  compareRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  compareCard: { flex: 1, padding: 14, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
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

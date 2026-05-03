import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import colors from "@/constants/colors";
import { COUNTRIES } from "@/constants/translations";
import type { Goal } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useColors } from "@/hooks/useColors";

const TOTAL_STEPS = 5;

export default function OnboardingScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { setUserProfile } = useApp();
  const { t } = useLanguage();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState("us");
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState<Goal>("understand");

  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0];

  const GOALS: { id: Goal; labelKey: string; descKey: string; icon: keyof typeof Feather.glyphMap }[] = [
    { id: "understand", labelKey: "goalUnderstand", descKey: "goalUnderstandDesc", icon: "eye" },
    { id: "save", labelKey: "goalSave", descKey: "goalSaveDesc", icon: "trending-up" },
    { id: "reduce-food", labelKey: "goalReduceFood", descKey: "goalReduceFoodDesc", icon: "coffee" },
    { id: "control-shopping", labelKey: "goalControlShopping", descKey: "goalControlShoppingDesc", icon: "shopping-bag" },
    { id: "track-budget", labelKey: "goalTrackBudget", descKey: "goalTrackBudgetDesc", icon: "target" },
  ];

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      setUserProfile({
        name: name.trim() || "User",
        countryCode,
        monthlyIncome: parseFloat(income) || 4500,
        monthlyBudget: parseFloat(budget) || 2500,
        savingsGoal: (parseFloat(income) || 4500) * 0.2,
        selectedGoal: goal,
        onboardingComplete: true,
      });
      router.replace("/" as any);
    }
  };

  const canProceed =
    step === 0 ? name.trim().length > 0
    : step === 1 ? countryCode.length > 0
    : step === 2 ? income.length > 0 && parseFloat(income) > 0
    : step === 3 ? budget.length > 0 && parseFloat(budget) > 0
    : true;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}> 
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.progress}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View key={i} style={[styles.dot, { backgroundColor: i <= step ? col.primary : col.border, width: i === step ? 24 : 8 }]} />
            ))}
          </View>

          {step === 0 && (
            <View key="step0">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="user" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>{t("whatsYourName")}</Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>{t("reportsPersonalized")}</Text>
              <View style={[styles.inputRow, { borderColor: col.border, backgroundColor: col.card }]}>
                <TextInput style={[styles.input, { color: col.foreground }]} placeholder={t("yourName")} placeholderTextColor={col.mutedForeground} value={name} onChangeText={setName} autoFocus autoCapitalize="words" />
              </View>
            </View>
          )}

          {step === 1 && (
            <View key="step1">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="globe" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>{t("chooseYourCountry")}</Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>{t("countrySubtitle")}</Text>
              <View style={styles.countryList}>
                {COUNTRIES.map((country) => {
                  const active = country.code === countryCode;
                  return (
                    <TouchableOpacity key={country.code} style={[styles.countryItem, { backgroundColor: active ? col.secondary : col.card, borderColor: active ? col.primary : col.border }]} onPress={() => { setCountryCode(country.code); Haptics.selectionAsync(); }}>
                      <View style={styles.countryLeft}>
                        <View style={[styles.countryIcon, { backgroundColor: col.primary + "16" }]}>
                          <Text style={[styles.countrySymbol, { color: col.primary }]}>{country.symbol}</Text>
                        </View>
                        <View>
                          <Text style={[styles.countryName, { color: col.foreground }]}>{country.nativeName}</Text>
                          <Text style={[styles.countrySub, { color: col.mutedForeground }]}>{country.name}</Text>
                        </View>
                      </View>
                      {active && <Feather name="check-circle" size={18} color={col.primary} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {step === 2 && (
            <View key="step2">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="dollar-sign" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>{t("whatsYourIncome")}</Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>{t("helpPlanBudget")}</Text>
              <View style={[styles.inputRow, { borderColor: col.border, backgroundColor: col.card }]}>
                <Text style={[styles.currency, { color: col.mutedForeground }]}>{selectedCountry.symbol}</Text>
                <TextInput style={[styles.input, { color: col.foreground }]} placeholder="4,500" placeholderTextColor={col.mutedForeground} keyboardType="numeric" value={income} onChangeText={setIncome} autoFocus />
              </View>
            </View>
          )}

          {step === 3 && (
            <View key="step3">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="target" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>{t("monthlyLimit")}</Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>{t("setABudget")}</Text>
              <View style={[styles.inputRow, { borderColor: col.border, backgroundColor: col.card }]}>
                <Text style={[styles.currency, { color: col.mutedForeground }]}>{selectedCountry.symbol}</Text>
                <TextInput style={[styles.input, { color: col.foreground }]} placeholder="2,500" placeholderTextColor={col.mutedForeground} keyboardType="numeric" value={budget} onChangeText={setBudget} autoFocus />
              </View>
              {income && budget && parseFloat(budget) > parseFloat(income) && <Text style={[styles.hint, { color: col.warning }]}>{t("budgetHigherThanIncome")}</Text>}
            </View>
          )}

          {step === 4 && (
            <View key="step4">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="flag" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>{t("whatsYourGoal")}</Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>{t("tailorInsights")}</Text>
              <View style={styles.goals}>
                {GOALS.map((g) => (
                  <TouchableOpacity key={g.id} style={[styles.goalItem, { backgroundColor: goal === g.id ? col.secondary : col.card, borderColor: goal === g.id ? col.primary : col.border }]} onPress={() => { setGoal(g.id); Haptics.selectionAsync(); }}>
                    <View style={[styles.goalIcon, { backgroundColor: goal === g.id ? col.primary : col.muted }]}>
                      <Feather name={g.icon} size={16} color={goal === g.id ? "#fff" : col.mutedForeground} />
                    </View>
                    <View style={styles.goalText}>
                      <Text style={[styles.goalLabel, { color: col.foreground }]}>{t(g.labelKey as any)}</Text>
                      <Text style={[styles.goalDesc, { color: col.mutedForeground }]}>{t(g.descKey as any)}</Text>
                    </View>
                    {goal === g.id && <Feather name="check-circle" size={18} color={col.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + 16, paddingHorizontal: 24, backgroundColor: col.background }]}>
          {step > 0 && (
            <TouchableOpacity onPress={() => { Haptics.selectionAsync(); setStep((s) => s - 1); }} style={[styles.backBtn, { borderColor: col.border }]}>
              <Feather name="arrow-left" size={20} color={col.foreground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.nextBtn, { backgroundColor: canProceed ? col.primary : col.muted, flex: 1 }]} onPress={handleNext} disabled={!canProceed}>
            <Text style={[styles.nextText, { color: canProceed ? "#fff" : col.mutedForeground }]}>{step === TOTAL_STEPS - 1 ? t("getStarted") : t("continue")}</Text>
            <Feather name={step === TOTAL_STEPS - 1 ? "check" : "arrow-right"} size={18} color={canProceed ? "#fff" : col.mutedForeground} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: { paddingHorizontal: 24 },
  progress: { flexDirection: "row", gap: 6, marginBottom: 40, alignItems: "center" },
  dot: { height: 8, borderRadius: 4 },
  iconBig: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: "700", marginBottom: 8, letterSpacing: -0.5 },
  subheading: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderRadius: colors.radius, paddingHorizontal: 16, paddingVertical: 14 },
  currency: { fontSize: 22, fontWeight: "600", marginRight: 8 },
  input: { flex: 1, fontSize: 24, fontWeight: "600" },
  hint: { marginTop: 8, fontSize: 13 },
  countryList: { gap: 10 },
  countryItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderWidth: 1.5, borderRadius: colors.radius },
  countryLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  countryIcon: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  countrySymbol: { fontSize: 13, fontWeight: "800" },
  countryName: { fontSize: 14, fontWeight: "700" },
  countrySub: { fontSize: 12, marginTop: 1 },
  goals: { gap: 10 },
  goalItem: { flexDirection: "row", alignItems: "center", padding: 14, borderWidth: 1.5, borderRadius: colors.radius, gap: 12 },
  goalIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  goalText: { flex: 1 },
  goalLabel: { fontSize: 14, fontWeight: "600" },
  goalDesc: { fontSize: 12, marginTop: 1 },
  footer: { flexDirection: "row", gap: 12, paddingTop: 12 },
  backBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  nextBtn: { height: 52, borderRadius: 26, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  nextText: { fontSize: 16, fontWeight: "600" },
});

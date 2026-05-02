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
import type { Goal } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

const GOALS: { id: Goal; label: string; desc: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: "understand", label: "Understand my spending", desc: "See where your money really goes", icon: "eye" },
  { id: "save",       label: "Save more money",        desc: "Build healthy saving habits",     icon: "trending-up" },
  { id: "reduce-food",label: "Reduce food expenses",   desc: "Cut back on dining and groceries",icon: "coffee" },
  { id: "control-shopping", label: "Control shopping", desc: "Spend smarter on purchases",      icon: "shopping-bag" },
  { id: "track-budget", label: "Track monthly budget", desc: "Stay within your spending limit", icon: "target" },
];

const TOTAL_STEPS = 4;

export default function OnboardingScreen() {
  const col = useColors();
  const insets = useSafeAreaInsets();
  const { setUserProfile } = useApp();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [income, setIncome] = useState("");
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState<Goal>("understand");

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      setUserProfile({
        name: name.trim() || "User",
        monthlyIncome: parseFloat(income) || 4500,
        monthlyBudget: parseFloat(budget) || 2500,
        savingsGoal: (parseFloat(income) || 4500) * 0.2,
        selectedGoal: goal,
        onboardingComplete: true,
      });
      router.replace("/(tabs)/");
    }
  };

  const canProceed =
    step === 0 ? name.trim().length > 0
    : step === 1 ? income.length > 0 && parseFloat(income) > 0
    : step === 2 ? budget.length > 0 && parseFloat(budget) > 0
    : true;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: col.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: topPad + 24, paddingBottom: insets.bottom + 40 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Progress */}
          <View style={styles.progress}>
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i <= step ? col.primary : col.border,
                    width: i === step ? 24 : 8,
                  },
                ]}
              />
            ))}
          </View>

          {step === 0 && (
            <View key="step0">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="user" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>
                What's your name?
              </Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>
                Your reports will be personalized with your name
              </Text>
              <View style={[styles.inputRow, { borderColor: col.border, backgroundColor: col.card }]}>
                <TextInput
                  style={[styles.input, { color: col.foreground }]}
                  placeholder="Your name"
                  placeholderTextColor={col.mutedForeground}
                  value={name}
                  onChangeText={setName}
                  autoFocus
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {step === 1 && (
            <View key="step1">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="dollar-sign" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>
                What's your monthly income?
              </Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>
                We'll use this to help you plan your budget
              </Text>
              <View style={[styles.inputRow, { borderColor: col.border, backgroundColor: col.card }]}>
                <Text style={[styles.currency, { color: col.mutedForeground }]}>$</Text>
                <TextInput
                  style={[styles.input, { color: col.foreground }]}
                  placeholder="4,500"
                  placeholderTextColor={col.mutedForeground}
                  keyboardType="numeric"
                  value={income}
                  onChangeText={setIncome}
                  autoFocus
                />
              </View>
            </View>
          )}

          {step === 2 && (
            <View key="step2">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="target" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>
                Monthly spending limit?
              </Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>
                Set a budget to track whether you're on track
              </Text>
              <View style={[styles.inputRow, { borderColor: col.border, backgroundColor: col.card }]}>
                <Text style={[styles.currency, { color: col.mutedForeground }]}>$</Text>
                <TextInput
                  style={[styles.input, { color: col.foreground }]}
                  placeholder="2,500"
                  placeholderTextColor={col.mutedForeground}
                  keyboardType="numeric"
                  value={budget}
                  onChangeText={setBudget}
                  autoFocus
                />
              </View>
              {income && budget && parseFloat(budget) > parseFloat(income) && (
                <Text style={[styles.hint, { color: col.warning }]}>
                  Budget is higher than income — are you sure?
                </Text>
              )}
            </View>
          )}

          {step === 3 && (
            <View key="step3">
              <View style={[styles.iconBig, { backgroundColor: col.secondary }]}>
                <Feather name="flag" size={32} color={col.primary} />
              </View>
              <Text style={[styles.heading, { color: col.foreground }]}>
                What's your main goal?
              </Text>
              <Text style={[styles.subheading, { color: col.mutedForeground }]}>
                We'll tailor insights and tips for you
              </Text>
              <View style={styles.goals}>
                {GOALS.map((g) => (
                  <TouchableOpacity
                    key={g.id}
                    style={[
                      styles.goalItem,
                      {
                        backgroundColor: goal === g.id ? col.secondary : col.card,
                        borderColor: goal === g.id ? col.primary : col.border,
                      },
                    ]}
                    onPress={() => {
                      setGoal(g.id);
                      Haptics.selectionAsync();
                    }}
                  >
                    <View style={[styles.goalIcon, { backgroundColor: goal === g.id ? col.primary : col.muted }]}>
                      <Feather name={g.icon} size={16} color={goal === g.id ? "#fff" : col.mutedForeground} />
                    </View>
                    <View style={styles.goalText}>
                      <Text style={[styles.goalLabel, { color: col.foreground }]}>{g.label}</Text>
                      <Text style={[styles.goalDesc, { color: col.mutedForeground }]}>{g.desc}</Text>
                    </View>
                    {goal === g.id && (
                      <Feather name="check-circle" size={18} color={col.primary} />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        <View
          style={[
            styles.footer,
            { paddingBottom: insets.bottom + 16, paddingHorizontal: 24, backgroundColor: col.background },
          ]}
        >
          {step > 0 && (
            <TouchableOpacity
              onPress={() => { Haptics.selectionAsync(); setStep((s) => s - 1); }}
              style={[styles.backBtn, { borderColor: col.border }]}
            >
              <Feather name="arrow-left" size={20} color={col.foreground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.nextBtn,
              { backgroundColor: canProceed ? col.primary : col.muted, flex: 1 },
            ]}
            onPress={handleNext}
            disabled={!canProceed}
          >
            <Text style={[styles.nextText, { color: canProceed ? "#fff" : col.mutedForeground }]}>
              {step === TOTAL_STEPS - 1 ? "Get started" : "Continue"}
            </Text>
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
  iconBig: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: "center", justifyContent: "center", marginBottom: 24,
  },
  heading: { fontSize: 26, fontWeight: "700", marginBottom: 8, letterSpacing: -0.5 },
  subheading: { fontSize: 15, lineHeight: 22, marginBottom: 32 },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    borderWidth: 1.5, borderRadius: colors.radius,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  currency: { fontSize: 22, fontWeight: "600", marginRight: 8 },
  input: { flex: 1, fontSize: 24, fontWeight: "600" },
  hint: { marginTop: 8, fontSize: 13 },
  goals: { gap: 10 },
  goalItem: {
    flexDirection: "row", alignItems: "center",
    padding: 14, borderWidth: 1.5, borderRadius: colors.radius, gap: 12,
  },
  goalIcon: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  goalText: { flex: 1 },
  goalLabel: { fontSize: 14, fontWeight: "600" },
  goalDesc: { fontSize: 12, marginTop: 1 },
  footer: { flexDirection: "row", gap: 12, paddingTop: 12 },
  backBtn: {
    width: 52, height: 52, borderRadius: 26,
    borderWidth: 1.5, alignItems: "center", justifyContent: "center",
  },
  nextBtn: {
    height: 52, borderRadius: 26,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
  },
  nextText: { fontSize: 16, fontWeight: "600" },
});

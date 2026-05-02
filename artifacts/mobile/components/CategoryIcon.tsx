import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import type { Category } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";

type CategoryConfig = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  bg: string;
};

const CATEGORY_CONFIG: Record<Category, { icon: string; color: string; lightBg: string; darkBg: string }> = {
  food:          { icon: "food-fork-drink",    color: "#F97316", lightBg: "#FFF7ED", darkBg: "#431407" },
  transport:     { icon: "car-outline",         color: "#3B82F6", lightBg: "#EFF6FF", darkBg: "#1E3A5F" },
  shopping:      { icon: "shopping-outline",    color: "#EC4899", lightBg: "#FDF2F8", darkBg: "#500724" },
  rent:          { icon: "home-outline",        color: "#6366F1", lightBg: "#EEF2FF", darkBg: "#1E1B4B" },
  bills:         { icon: "lightning-bolt",      color: "#EAB308", lightBg: "#FEFCE8", darkBg: "#422006" },
  health:        { icon: "heart-pulse",         color: "#EF4444", lightBg: "#FEF2F2", darkBg: "#450A0A" },
  entertainment: { icon: "movie-open-outline",  color: "#8B5CF6", lightBg: "#F5F3FF", darkBg: "#2E1065" },
  education:     { icon: "book-open-outline",   color: "#14B8A6", lightBg: "#F0FDFA", darkBg: "#042F2E" },
  travel:        { icon: "airplane",            color: "#06B6D4", lightBg: "#ECFEFF", darkBg: "#083344" },
  family:        { icon: "account-group",       color: "#10B981", lightBg: "#ECFDF5", darkBg: "#064E3B" },
  other:         { icon: "dots-horizontal",     color: "#6B7280", lightBg: "#F9FAFB", darkBg: "#111827" },
};

interface Props {
  category: Category;
  size?: "sm" | "md" | "lg";
  isDark?: boolean;
}

const SIZES = { sm: 28, md: 40, lg: 52 };
const ICON_SIZES = { sm: 14, md: 20, lg: 26 };

export function CategoryIcon({ category, size = "md", isDark = false }: Props) {
  const cfg = CATEGORY_CONFIG[category] ?? CATEGORY_CONFIG.other;
  const dim = SIZES[size];
  const iconSize = ICON_SIZES[size];
  const bg = isDark ? cfg.darkBg : cfg.lightBg;

  return (
    <View
      style={[
        styles.container,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: bg },
      ]}
    >
      <MaterialCommunityIcons
        name={cfg.icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={iconSize}
        color={cfg.color}
      />
    </View>
  );
}

export function getCategoryColor(category: Category): string {
  return CATEGORY_CONFIG[category]?.color ?? "#6B7280";
}

export function getCategoryLabel(category: Category): string {
  const labels: Record<Category, string> = {
    food: "Food",
    transport: "Transport",
    shopping: "Shopping",
    rent: "Rent",
    bills: "Bills",
    health: "Health",
    entertainment: "Entertainment",
    education: "Education",
    travel: "Travel",
    family: "Family",
    other: "Other",
  };
  return labels[category] ?? "Other";
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

import { MaterialCommunityIcons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";

import colors from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

export type InsightType = "info" | "warning" | "success" | "tip";

interface Props {
  title: string;
  description: string;
  type?: InsightType;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  index?: number;
}

const TYPE_CONFIG = {
  info:    { icon: "information-outline", color: "#3B82F6", bg: "#EFF6FF", darkBg: "#1E3A5F" },
  warning: { icon: "alert-outline",       color: "#D97706", bg: "#FEF3C7", darkBg: "#451A03" },
  success: { icon: "check-circle-outline",color: "#059669", bg: "#D1FAE5", darkBg: "#064E3B" },
  tip:     { icon: "lightbulb-outline",   color: "#7C3AED", bg: "#F5F3FF", darkBg: "#2E1065" },
};

export function InsightCard({ title, description, type = "info", icon, index = 0 }: Props) {
  const col = useColors();
  const cfg = TYPE_CONFIG[type];
  const iconName = (icon ?? cfg.icon) as keyof typeof MaterialCommunityIcons.glyphMap;

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: col.card,
            borderColor: col.border,
            borderRadius: colors.radius,
            borderLeftColor: cfg.color,
          },
        ]}
      >
        <View style={[styles.iconContainer, { backgroundColor: cfg.bg }]}>
          <MaterialCommunityIcons name={iconName} size={20} color={cfg.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, { color: col.foreground }]}>{title}</Text>
          <Text style={[styles.description, { color: col.mutedForeground }]}>{description}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: 12,
    alignItems: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", marginBottom: 2 },
  description: { fontSize: 13, lineHeight: 18 },
});

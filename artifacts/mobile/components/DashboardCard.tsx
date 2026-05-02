import React from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";

import { useColors } from "@/hooks/useColors";
import colors from "@/constants/colors";

interface Props {
  title: string;
  value: string;
  subtitle?: string;
  subtitleColor?: string;
  badge?: string;
  badgeColor?: string;
  style?: ViewStyle;
  children?: React.ReactNode;
  compact?: boolean;
}

export function DashboardCard({
  title,
  value,
  subtitle,
  subtitleColor,
  badge,
  badgeColor,
  style,
  children,
  compact = false,
}: Props) {
  const col = useColors();

  return (
    <View style={[styles.card, { backgroundColor: col.card, borderColor: col.border, borderRadius: colors.radius }, style]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: col.mutedForeground }]}>{title}</Text>
        {badge && (
          <View style={[styles.badge, { backgroundColor: badgeColor ?? col.secondary }]}>
            <Text style={[styles.badgeText, { color: badgeColor ? "#fff" : col.primary }]}>{badge}</Text>
          </View>
        )}
      </View>
      <Text style={[styles.value, { color: col.foreground, fontSize: compact ? 22 : 28 }]}>{value}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: subtitleColor ?? col.mutedForeground }]}>{subtitle}</Text>
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: "500",
  },
  value: {
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
});

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, G } from "react-native-svg";

import type { Category } from "@/context/AppContext";
import { getCategoryColor } from "@/components/CategoryIcon";
import { useColors } from "@/hooks/useColors";

interface Slice {
  category: Category;
  amount: number;
  percentage: number;
}

interface Props {
  data: Slice[];
  size?: number;
  innerRadius?: number;
  centerLabel?: string;
  centerSubLabel?: string;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, ir: number, startAngle: number, endAngle: number): string {
  const outerStart = polarToCartesian(cx, cy, r, endAngle);
  const outerEnd = polarToCartesian(cx, cy, r, startAngle);
  const innerStart = polarToCartesian(cx, cy, ir, endAngle);
  const innerEnd = polarToCartesian(cx, cy, ir, startAngle);
  const largeArc = endAngle - startAngle > 180 ? "1" : "0";
  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${r} ${r} 0 ${largeArc} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${ir} ${ir} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export function DonutChart({ data, size = 200, innerRadius = 60, centerLabel, centerSubLabel }: Props) {
  const colors = useColors();
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 8;

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { width: size, height: size }]}>
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data</Text>
      </View>
    );
  }

  const slices: { path: string; color: string }[] = [];
  let currentAngle = 0;

  data.forEach((slice) => {
    if (slice.percentage <= 0) return;
    const sweepAngle = (slice.percentage / 100) * 360;
    const endAngle = currentAngle + sweepAngle;
    const gap = data.length > 1 ? 2 : 0;
    const path = arcPath(cx, cy, outerR, innerRadius, currentAngle + gap / 2, endAngle - gap / 2);
    slices.push({ path, color: getCategoryColor(slice.category) });
    currentAngle = endAngle;
  });

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <G>
          {slices.map((s, i) => (
            <Path key={i} d={s.path} fill={s.color} />
          ))}
        </G>
      </Svg>
      {(centerLabel || centerSubLabel) && (
        <View style={[styles.center, { width: innerRadius * 2 - 8, height: innerRadius * 2 - 8 }]}>
          {centerLabel && (
            <Text style={[styles.centerLabel, { color: colors.foreground }]} numberOfLines={1}>
              {centerLabel}
            </Text>
          )}
          {centerSubLabel && (
            <Text style={[styles.centerSub, { color: colors.mutedForeground }]} numberOfLines={1}>
              {centerSubLabel}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 14 },
  center: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  centerLabel: {
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  centerSub: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 2,
  },
});

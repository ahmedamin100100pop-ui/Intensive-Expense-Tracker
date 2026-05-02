import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, G } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface BarData {
  label: string;
  value: number;
  color?: string;
}

interface Props {
  data: BarData[];
  width?: number;
  height?: number;
}

export function BarChart({ data, width = 300, height = 140 }: Props) {
  const colors = useColors();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>No data</Text>
      </View>
    );
  }

  const paddingLeft = 4;
  const paddingRight = 4;
  const paddingTop = 8;
  const paddingBottom = 28;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barSpacing = 6;
  const barWidth = (chartW - barSpacing * (data.length + 1)) / data.length;
  const radius = Math.min(4, barWidth / 2);

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <G>
          {data.map((d, i) => {
            const barH = Math.max((d.value / maxVal) * chartH, 2);
            const x = paddingLeft + barSpacing + i * (barWidth + barSpacing);
            const y = paddingTop + chartH - barH;
            const barColor = d.color ?? colors.primary;
            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={barWidth}
                height={barH}
                rx={radius}
                ry={radius}
                fill={barColor}
                opacity={0.9}
              />
            );
          })}
        </G>
      </Svg>
      <View style={[styles.labels, { paddingHorizontal: paddingLeft + barSpacing }]}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[styles.label, { color: colors.mutedForeground, width: barWidth + barSpacing }]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
  labels: {
    flexDirection: "row",
    marginTop: -24,
  },
  label: {
    fontSize: 9,
    textAlign: "center",
  },
});

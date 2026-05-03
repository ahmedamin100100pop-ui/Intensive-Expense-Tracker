import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";

import { useColors } from "@/hooks/useColors";

interface DataPoint {
  label: string;
  value: number;
}

interface Props {
  data: DataPoint[];
  width?: number;
  height?: number;
  showDots?: boolean;
}

export function SpendingLineChart({ data, width = 300, height = 140, showDots = true }: Props) {
  const colors = useColors();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}> 
        <Text style={{ color: colors.mutedForeground, fontSize: 13 }}>Not enough data</Text>
      </View>
    );
  }

  const paddingLeft = 8;
  const paddingRight = 8;
  const paddingTop = 12;
  const paddingBottom = 24;
  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => d.value));
  const minVal = Math.min(...data.map((d) => d.value));
  const range = maxVal - minVal || 1;

  const toX = (i: number) => (data.length === 1 ? width / 2 : paddingLeft + (i / (data.length - 1)) * chartW);
  const toY = (v: number) => paddingTop + chartH - ((v - minVal) / range) * chartH;

  const linePath =
    data.length === 1
      ? `M ${toX(0)} ${toY(data[0].value)} L ${toX(0.001)} ${toY(data[0].value)}`
      : data.map((d, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(d.value)}`).join(" ");

  const areaPath =
    data.length === 1
      ? [
          `M ${toX(0)} ${toY(data[0].value)}`,
          `L ${toX(0)} ${paddingTop + chartH}`,
          `L ${toX(0)} ${paddingTop + chartH}`,
          "Z",
        ].join(" ")
      : [
          linePath,
          `L ${toX(data.length - 1)} ${paddingTop + chartH}`,
          `L ${toX(0)} ${paddingTop + chartH}`,
          "Z",
        ].join(" ");

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primary} stopOpacity="0.25" />
            <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill="url(#lineGrad)" />
        <Path d={linePath} fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {showDots && data.map((d, i) => (
          <Circle
            key={i}
            cx={toX(i)}
            cy={toY(d.value)}
            r={3.5}
            fill={colors.primary}
            stroke={colors.card}
            strokeWidth={1.5}
          />
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: "center", justifyContent: "center" },
});

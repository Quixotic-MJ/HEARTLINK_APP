import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useColorScheme } from "nativewind";

const AnimatedPath = Animated.createAnimatedComponent(Path);

export function RitualProgress({
  completedCount,
  missedCount,
  totalSod,
  satFat,
  movementMins,
  movementGoal,
}: {
  completedCount: number;
  missedCount: number;
  totalSod: number;
  satFat: number;
  movementMins: number;
  movementGoal: number;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const primaryColor = "#10B981"; // Emerald 500
  const trackColor = isDark ? "#334155" : "#e2e8f0"; // slate-700 / slate-200

  return (
    <View
      className="bg-surface-card rounded-3xl p-5 mb-0 shadow-sm shadow-slate-200/50 dark:shadow-none"
    >
      <View className="flex-row justify-between gap-4">
        <MiniTracker label="Sat fat" current={satFat} target={20} unit="g" isDark={isDark} color={primaryColor} trackColor={trackColor} />
        <MiniTracker label="Movement" current={movementMins} target={movementGoal} unit="min" isDark={isDark} color={primaryColor} trackColor={trackColor} />
        <MiniTracker label="Sodium" current={totalSod} target={2000} unit="mg" isDark={isDark} color={primaryColor} trackColor={trackColor} />
      </View>
    </View>
  );
}

function MiniTracker({
  label,
  current,
  target,
  unit,
  isDark,
  color,
  trackColor,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  isDark: boolean;
  color: string;
  trackColor: string;
}) {
  const percent = Math.min(Math.max((current / target) * 100, 0), 100);
  
  return (
    <View className="flex-1">
      <Text className="text-[12px] font-bold mb-2" style={{ color: isDark ? "#cbd5e1" : "#1e293b" }}>
        {label}
      </Text>
      <View className="h-[2px] w-full rounded-full overflow-hidden mb-2" style={{ backgroundColor: trackColor }}>
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </View>
      <Text className="text-[13px] font-bold" style={{ color: isDark ? "#f8fafc" : "#1e293b" }}>
        {current}<Text style={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: "600" }}>/{target}{unit}</Text>
      </Text>
    </View>
  );
}

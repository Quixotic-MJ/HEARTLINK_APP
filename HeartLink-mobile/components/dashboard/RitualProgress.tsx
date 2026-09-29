import React from "react";
import { View, Text } from "react-native";
import { useColorScheme } from "nativewind";
import { Feather } from "@expo/vector-icons";

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

  return (
    <View className="mb-0">
      <Text className="text-[11px] font-bold text-text-soft uppercase tracking-wider mb-2.5 mx-1">
        TODAY'S LIMITS
      </Text>
      <View
        className="bg-surface rounded-3xl p-5 shadow-sm shadow-slate-200/50 dark:shadow-none"
      >
        <View className="flex-row justify-between gap-4">
          <MiniTracker 
            label="Sat fat" 
            current={satFat} 
            target={20} 
            unit="g" 
            isDark={isDark} 
            iconName="droplet"
            isMaxLimit={true}
          />
          <MiniTracker 
            label="Movement" 
            current={movementMins} 
            target={movementGoal} 
            unit="min" 
            isDark={isDark} 
            iconName="activity"
            isMaxLimit={false}
          />
          <MiniTracker 
            label="Sodium" 
            current={totalSod} 
            target={2000} 
            unit="mg" 
            isDark={isDark} 
            iconName="box"
            isMaxLimit={true}
          />
        </View>
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
  iconName,
  isMaxLimit,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  isDark: boolean;
  iconName: keyof typeof Feather.glyphMap;
  isMaxLimit: boolean;
}) {
  const percent = Math.min(Math.max((current / target) * 100, 0), 100);
  
  let barColor = "#10B981"; // Emerald 500 (Green)
  
  if (isMaxLimit) {
    if (percent >= 85) {
      barColor = "#D97706"; // Amber 600 (Orange)
    } else {
      barColor = "#10B981"; // Green
    }
  } else {
    barColor = "#10B981"; // Green
  }

  return (
    <View className="flex-1">
      <View className="flex-row items-center gap-1.5 mb-2">
        <Feather name={iconName} size={12} color={isDark ? "#94a3b8" : "#64748b"} />
        <Text className="text-[12px] font-medium text-text-soft">
          {label}
        </Text>
      </View>
      <View style={{ height: 6, width: '100%', borderRadius: 9999, overflow: 'hidden', backgroundColor: isDark ? '#334155' : '#e2e8f0', marginBottom: 8 }}>
        <View style={{ height: '100%', width: `${percent}%`, backgroundColor: barColor, borderRadius: 9999 }} />
      </View>
      <Text className="text-[13px] font-bold" style={{ color: isDark ? "#f8fafc" : "#0f172a" }}>
        {current}<Text style={{ fontSize: 11, fontWeight: "500", color: isDark ? "#94a3b8" : "#64748b" }}>/{target}{unit}</Text>
      </Text>
    </View>
  );
}

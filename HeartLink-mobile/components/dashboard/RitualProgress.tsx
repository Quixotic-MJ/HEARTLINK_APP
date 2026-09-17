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

  // Arc configuration
  const R = 70;
  const strokeWidth = 10;
  const cx = R + strokeWidth;
  const cy = R + strokeWidth;
  const pathD = `M ${strokeWidth} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`;
  
  // The length of the semi-circle is π * R
  const arcLength = Math.PI * R;

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: completedCount / 4,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [completedCount, progressAnim]);

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [arcLength, 0],
  });

  const primaryColor = "#10B981"; // Emerald 500
  const trackColor = isDark ? "#334155" : "#e2e8f0"; // slate-700 / slate-200
  const textColor = isDark ? "#f8fafc" : "#1e293b";
  const subTextColor = isDark ? "#94a3b8" : "#64748b";

  return (
    <View
      className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 p-6 mb-3 shadow-sm"
    >
      {/* Top Arc Section */}
      <View className="flex-row items-center justify-between">
        {/* Left Stats */}
        <View className="items-center w-16">
          <Text className="text-[22px] font-bold" style={{ color: textColor }}>{missedCount}</Text>
          <Text className="text-[12px] font-medium" style={{ color: subTextColor }}>Missed</Text>
        </View>

        {/* Center Arc */}
        <View className="items-center justify-center relative" style={{ width: cx * 2, height: cy + 10 }}>
          <Svg width={cx * 2} height={cy} viewBox={`0 0 ${cx * 2} ${cy}`}>
            <Path
              d={pathD}
              stroke={trackColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
            />
            <AnimatedPath
              d={pathD}
              stroke={primaryColor}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
            />
          </Svg>
          {/* Arc inner text */}
          <View className="absolute bottom-1 items-center">
            <Text className="text-[26px] font-bold" style={{ color: textColor }}>
              {completedCount}/4
            </Text>
            <Text className="text-[12px] font-medium" style={{ color: subTextColor }}>
              Protected
            </Text>
          </View>
        </View>

        {/* Right Stats */}
        <View className="items-center w-16">
          <Text className="text-[22px] font-bold" style={{ color: textColor }}>{totalSod}</Text>
          <Text className="text-[11px] font-medium text-center" style={{ color: subTextColor }}>Total Sod.</Text>
        </View>
      </View>

      <View className="h-[1px] w-full bg-slate-100 dark:bg-slate-800 my-4" />

      {/* Bottom Trackers */}
      <View className="flex-row justify-between gap-2">
        <MiniTracker label="Sat Fat" current={satFat} target={20} unit="g" isDark={isDark} color={primaryColor} trackColor={trackColor} />
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
    <View className="items-center flex-1">
      <Text className="text-[11px] font-medium mb-1.5" style={{ color: isDark ? "#cbd5e1" : "#64748b" }}>
        {label}
      </Text>
      <View className="h-1.5 w-full rounded-full overflow-hidden mb-1.5" style={{ backgroundColor: trackColor }}>
        <View className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
      </View>
      <Text className="text-[12px] font-bold" style={{ color: isDark ? "#f8fafc" : "#1e293b" }}>
        {current} <Text style={{ color: isDark ? "#94a3b8" : "#64748b", fontWeight: "400" }}>/ {target} {unit}</Text>
      </Text>
    </View>
  );
}

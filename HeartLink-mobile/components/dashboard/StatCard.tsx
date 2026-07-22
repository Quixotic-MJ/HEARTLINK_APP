import React from "react";
import { View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";

export function StatCard({
  icon,
  label,
  value,
  iconColor,
  iconBg,
}: {
  icon: string;
  label: string;
  value: string;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <View
      accessible={true}
      accessibilityLabel={`${label}: ${value}`}
      className="flex-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 py-3 px-3 items-center"
    >
      <View
        className="w-8 h-8 rounded-xl items-center justify-center mb-1.5"
        style={{ backgroundColor: iconBg }}
      >
        <Feather name={icon as any} size={14} color={iconColor} />
      </View>
      <Text className="text-[15px] font-medium text-slate-900 dark:text-white">
        {value}
      </Text>
      <Text className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wide">
        {label}
      </Text>
    </View>
  );
}

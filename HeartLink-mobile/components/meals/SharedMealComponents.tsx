import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

// ─── Choice Chip ──────────────────────────────────────────────────────────────

export function ChoiceChip<T extends string>({
  label,
  selected,
  onSelect,
}: {
  label: T;
  selected: boolean;
  onSelect: (val: T) => void;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={() => onSelect(label)}
      className="px-4 py-2 rounded-xl border mr-2 mb-2"
      style={{
        backgroundColor: selected ? "#0f172a" : "#fff",
        borderColor: selected ? "#0f172a" : "#e2e8f0",
      }}
    >
      <Text
        className="text-[13px] font-medium"
        style={{ color: selected ? "#fff" : "#64748b" }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, icon, helperText }: { title: string; icon: string; helperText?: string }) {
  return (
    <View className="mb-3 mt-5">
      <View className="flex-row items-center gap-2">
        <MaterialCommunityIcons name={icon as any} size={16} color="#94a3b8" />
        <Text className="text-[13px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex-1">
          {title}
        </Text>
      </View>
      {helperText && (
        <Text className="text-[11px] text-slate-400 font-medium mt-1 ml-6">{helperText}</Text>
      )}
    </View>
  );
}

// ─── Risk Calculator ──────────────────────────────────────────────────────────

export type RiskResult = {
  level: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
  icon: keyof typeof Feather.glyphMap;
};

export function calcRiskFromValues(sodium: number, calories: number, satFat: number): RiskResult {
  if (sodium > 800 || satFat > 6) {
    return {
      level: "High Sodium",
      color: "#ef4444",
      bg: "rgba(239, 68, 68, 0.1)",
      border: "rgba(239, 68, 68, 0.3)",
      desc: "Sodium exceeds 800 mg per serving. Frequent consumption increases blood pressure.",
      icon: "alert-circle",
    };
  }
  if (sodium > 400 || satFat > 3) {
    return {
      level: "Moderate",
      color: "#f59e0b",
      bg: "rgba(245, 158, 11, 0.1)",
      border: "rgba(245, 158, 11, 0.3)",
      desc: "Moderate sodium content. Fits within daily budget if other meals are light.",
      icon: "info",
    };
  }
  return {
    level: "Heart-Friendly",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.1)",
    border: "rgba(16, 185, 129, 0.3)",
    desc: "Low sodium and saturated fat. Excellent choice for cardiovascular stability.",
    icon: "check-circle",
  };
}

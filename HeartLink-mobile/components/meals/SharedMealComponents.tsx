import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../constants/theme";
import { foodImpact, type FoodImpact } from "../../services/foodAdvice";

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
    >
      <Text
        className="text-[13px] font-medium"
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
        <MaterialCommunityIcons name={icon as any} size={16} color={theme.textSoft} />
        <Text className="text-[13px] font-medium text-text-soft uppercase tracking-wide flex-1">
          {title}
        </Text>
      </View>
      {helperText && (
        <Text className="text-[11px] text-text-muted font-medium mt-1 ml-6">{helperText}</Text>
      )}
    </View>
  );
}

// ─── Risk Calculator ──────────────────────────────────────────────────────────

export type RiskResult = {
  level: string;
  tone: FoodImpact["tone"];
  desc: string;
  icon: keyof typeof Feather.glyphMap;
};

const RISK_ICON = { high: "alert-circle", medium: "info", low: "check-circle" } as const;

export function calcRiskFromValues(sodium: number, calories: number, satFat: number): RiskResult {
  const impact = foodImpact(sodium, satFat);
  return { level: impact.title, tone: impact.tone, desc: impact.desc, icon: RISK_ICON[impact.tone] };
}

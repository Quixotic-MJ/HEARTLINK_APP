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
      className="flex-1 bg-card rounded-2xl border border-border py-4 px-2 items-center"
    >
      <View
        className="w-10 h-10 rounded-xl items-center justify-center mb-2"
        style={{ backgroundColor: iconBg }}
      >
        <Feather name={icon as any} size={16} color={iconColor} />
      </View>
      <Text className="text-[17px] font-bold text-foreground">
        {value}
      </Text>
      <Text className="text-[11px] text-muted-foreground mt-1 uppercase tracking-wide font-medium">
        {label}
      </Text>
    </View>
  );
}

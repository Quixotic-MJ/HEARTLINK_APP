import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export function RecommendationCard({
  tag,
  title,
  subtitle,
  icon,
  bg,
  tagBg,
  tagText,
  subColor,
  onPress,
}: {
  tag: string;
  title: string;
  subtitle: string;
  icon: string;
  bg: string;
  tagBg: string;
  tagText: string;
  subColor: string;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`${tag} recommendation: ${title}. ${subtitle}`}
      className="w-[220px] h-[150px] rounded-2xl overflow-hidden bg-card border border-border"
    >
      <View
        style={{
          position: "absolute",
          bottom: -15,
          right: -15,
          opacity: 0.05,
        }}
      >
        <MaterialCommunityIcons name={icon as any} size={110} className="text-foreground" />
      </View>
      <View className="p-4 flex-1 justify-between">
        <View
          className="self-start px-2.5 py-1 rounded-lg bg-primary/10"
        >
          <Text className="text-[10px] font-bold uppercase tracking-wide text-primary">
            {tag}
          </Text>
        </View>
        <View>
          <Text
            className="text-[15px] font-semibold text-foreground leading-snug mb-1"
            numberOfLines={2}
          >
            {title}
          </Text>
          <Text className="text-[11px] text-muted-foreground">
            {subtitle}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
